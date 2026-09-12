import "server-only";

export class PayloadError extends Error {
  constructor(public readonly status: number) { super("Invalid payload"); }
}
export async function readPayload(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new PayloadError(415);
  const reader = request.body?.getReader();
  if (!reader) throw new PayloadError(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new PayloadError(413); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new PayloadError(400); }
}
export const privateHeaders = { "Cache-Control": "private, no-store" };
export function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}
