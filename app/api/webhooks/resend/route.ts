import { Resend } from "resend";
import PostalMime from "postal-mime";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const destination = "ciro.advertising@gmail.com";
const sender = "Cirix Mail <forward@cirixad.com>";
const receivedSchema = z.object({
  type: z.literal("email.received"),
  data: z.object({ email_id: z.string().uuid(), to: z.array(z.string()) }),
});

const belongsToDomain = (address: string) => /@cirixad\.com$/i.test(address.trim());
const reply = (status: number, ok: boolean) => Response.json({ ok }, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !secret) return reply(503, false);
  const resend = new Resend(apiKey);
  let event: unknown;
  try {
    // Verify the exact bytes received, with a bounded body even without Content-Length.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 65536) {
          await reader.cancel();
          return reply(413, false);
        }
        chunks.push(chunk.value);
      }
    }
    event = resend.webhooks.verify({
      payload: Buffer.concat(chunks).toString("utf8"),
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    return reply(400, false);
  }
  if (typeof event !== "object" || event === null || !("type" in event)) return reply(400, false);
  if (event.type !== "email.received") return reply(200, true);
  const parsed = receivedSchema.safeParse(event);
  if (!parsed.success) return reply(400, false);
  if (!parsed.data.data.to.some(belongsToDomain)) return reply(200, true);

  try {
    const { data: email, error } = await resend.emails.receiving.get(parsed.data.data.email_id);
    if (error || !email?.raw?.download_url) return reply(503, false);
    if (!email.to.some(belongsToDomain)) return reply(200, true);
    const raw = await fetch(email.raw.download_url, { signal: AbortSignal.timeout(20000) });
    if (!raw.ok) return reply(503, false);
    const message = await PostalMime.parse(await raw.arrayBuffer(), { attachmentEncoding: "base64" });
    const originalReplyTo = message.replyTo?.flatMap((entry) => "address" in entry && entry.address ? [entry.address] : []);
    const { error: sendError } = await resend.emails.send({
      from: sender,
      to: destination,
      replyTo: originalReplyTo?.length ? originalReplyTo : message.from?.address,
      subject: email.subject || "(sin asunto)",
      text: message.text || (message.html ? "" : "(mensaje sin contenido)"),
      html: message.html || undefined,
      attachments: message.attachments.map((attachment) => ({
        filename: attachment.filename || "attachment",
        content: attachment.content as string,
        contentType: attachment.mimeType,
        contentId: attachment.contentId?.replace(/^<|>$/g, ""),
      })),
      headers: { "X-Cirix-Original-To": email.to.join(", ") },
    }, { idempotencyKey: `cirix-forward/${parsed.data.data.email_id}` });
    // Return an error so Resend retries transient failures; never acknowledge lost mail.
    return reply(sendError ? 503 : 200, !sendError);
  } catch {
    // Do not log bodies, signed download URLs, or credentials.
    return reply(503, false);
  }
}
