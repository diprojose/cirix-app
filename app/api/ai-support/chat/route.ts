import { checkApiAccess } from "@/lib/auth/api-access";
import { NextRequest } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { hasLocale, type Locale } from "@/lib/locale";
import { getSupportMode } from "@/modules/ai-support/application/support-mode";
import { answerSimulatedSupport } from "@/modules/ai-support/application/simulated-support";
import type { SupportMode } from "@/modules/ai-support/application/public-commerce-knowledge";
import { LoyaltyCommerceKnowledge } from "@/modules/ai-support/infrastructure/loyalty-commerce-knowledge";
import {
  AiRateLimitConfigurationError,
  AiRateLimitError,
  enforceAiRateLimit,
} from "@/modules/ai-support/infrastructure/ai-rate-limit";
import {
  moderateSupportInput,
  OpenAiConfigurationError,
  OpenAiModerationError,
  streamOpenAiSupport,
} from "@/modules/ai-support/infrastructure/openai-support-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportMetadata = { mode: SupportMode };
type SupportMessage = UIMessage<SupportMetadata>;

const MAX_BODY_BYTES = 64 * 1024;
const MAX_USER_MESSAGES = 10;
const MAX_MESSAGE_CHARACTERS = 1_000;

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function validateConversation(messages: UIMessage[]): string | null {
  const users = messages.filter((message) => message.role === "user");
  if (users.length === 0 || users.length > MAX_USER_MESSAGES) {
    return "Conversation limit exceeded.";
  }
  if (messages.some((message) => message.role === "system")) {
    return "System messages are not accepted.";
  }
  if (users.some((message) => messageText(message).length === 0 || messageText(message).length > MAX_MESSAGE_CHARACTERS)) {
    return "Each user message must contain between 1 and 1000 characters.";
  }
  return null;
}

function simulatedStream(text: string) {
  const textId = crypto.randomUUID();
  return createUIMessageStream<SupportMessage>({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageMetadata: { mode: "simulated" } });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop", messageMetadata: { mode: "simulated" } });
    },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const accessDenied = await checkApiAccess();
  if (accessDenied) return accessDenied;

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return jsonError("Request is too large.", 413);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  if (JSON.stringify(raw).length > MAX_BODY_BYTES || !raw || typeof raw !== "object") {
    return jsonError("Invalid request body.", 400);
  }

  const input = raw as { messages?: unknown; locale?: unknown };
  const locale: Locale = typeof input.locale === "string" && hasLocale(input.locale) ? input.locale : "es";
  const mode = getSupportMode();
  const knowledge = new LoyaltyCommerceKnowledge();

  let messages: SupportMessage[];
  try {
    messages = await validateUIMessages<SupportMessage>({ messages: input.messages });
  } catch {
    return jsonError("Invalid chat messages.", 400);
  }

  const validationError = validateConversation(messages);
  if (validationError) return jsonError(validationError, 400);
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUser ? messageText(lastUser) : "";

  if (mode === "simulated") {
    try {
      const answer = await answerSimulatedSupport({ locale, text }, knowledge);
      return createUIMessageStreamResponse({
        stream: simulatedStream(answer),
        headers: { "Cache-Control": "no-store", "X-AI-Support-Mode": "simulated" },
      });
    } catch {
      return jsonError(locale === "es" ? "El demo no esta disponible ahora." : "The demo is unavailable right now.", 503);
    }
  }

  try {
    const limit = await enforceAiRateLimit(request);
    if (await moderateSupportInput(text)) {
      return jsonError(
        locale === "es" ? "No puedo ayudar con esa solicitud." : "I cannot help with that request.",
        400
      );
    }

    const result = await streamOpenAiSupport({
      messages,
      locale,
      knowledge,
      safetyIdentifier: limit.safetyIdentifier,
      abortSignal: request.signal,
    });
    const headers = new Headers({
      "Cache-Control": "no-store",
      "X-AI-Support-Mode": "ai",
    });
    if (limit.setCookie) headers.append("Set-Cookie", limit.setCookie);

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: messages,
        messageMetadata: (): SupportMetadata => ({ mode: "ai" }),
        onError: () => locale === "es"
          ? "La IA no pudo completar la respuesta. Intenta de nuevo."
          : "AI could not complete the response. Please try again.",
      }),
      headers,
    });
  } catch (error) {
    if (error instanceof AiRateLimitError) {
      return jsonError(
        locale === "es" ? "Limite del demo alcanzado." : "Demo limit reached.",
        429,
        { "Retry-After": String(error.retryAfterSeconds) }
      );
    }
    if (
      error instanceof AiRateLimitConfigurationError ||
      error instanceof OpenAiConfigurationError ||
      error instanceof OpenAiModerationError
    ) {
      console.error("AI support configuration error", error.message);
    } else {
      console.error("AI support failed", error);
    }
    return jsonError(
      locale === "es" ? "La IA real no esta disponible ahora." : "Live AI is unavailable right now.",
      503
    );
  }
}
