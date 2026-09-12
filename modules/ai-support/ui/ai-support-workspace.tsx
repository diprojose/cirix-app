"use client";

import { useToast } from "@/components/toast-provider";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/locale";
import type { SupportMode } from "../application/public-commerce-knowledge";

type SupportMetadata = { mode: SupportMode };
type SupportMessage = UIMessage<SupportMetadata>;

const COPY = {
  es: {
    back: "Volver a modulos",
    store: "Abrir tienda",
    title: "Asistente de compras",
    subtitle: "Consulta el catalogo, delivery, pagos y el programa de recompensas.",
    simulated: "Modo simulado · 0 tokens",
    ai: "Modo IA · consumo activo",
    simulatedNote: "Las respuestas siguen reglas locales y datos del demo. No se realiza ninguna llamada a OpenAI.",
    aiNote: "La IA esta habilitada manualmente. No compartas informacion personal o bancaria.",
    welcome: "Hola, ¿en que puedo ayudarte hoy?",
    welcomeDetail: "Puedo orientarte sobre productos, precios, delivery, pagos, rewards y referidos.",
    placeholder: "Escribe una pregunta sobre la tienda...",
    send: "Enviar",
    stop: "Detener",
    reset: "Nueva conversacion",
    retry: "Reintentar",
    consulting: "Consultando datos publicos...",
    limit: "Llegaste al limite de 10 mensajes de esta sesion.",
    disclaimer: "Demo de soporte. Verifica la informacion importante antes de comprar.",
    prompts: [
      "¿Como puedo contactarlos?",
      "¿Que hacen?",
      "¿Que venden?",
      "¿Cuanto cuesta el delivery?",
      "¿Que metodos de pago aceptan?",
      "¿Como funcionan los referidos?",
    ],
  },
  en: {
    back: "Back to modules",
    store: "Open store",
    title: "Shopping assistant",
    subtitle: "Ask about the catalog, delivery, payments, and rewards program.",
    simulated: "Simulated mode · 0 tokens",
    ai: "AI mode · usage active",
    simulatedNote: "Replies use local rules and demo data. No request is made to OpenAI.",
    aiNote: "AI was manually enabled. Do not share personal or banking information.",
    welcome: "Hi, how can I help today?",
    welcomeDetail: "I can help with products, prices, delivery, payments, rewards, and referrals.",
    placeholder: "Ask a question about the store...",
    send: "Send",
    stop: "Stop",
    reset: "New conversation",
    retry: "Retry",
    consulting: "Checking public data...",
    limit: "You reached the 10-message limit for this session.",
    disclaimer: "Support demo. Verify important information before purchasing.",
    prompts: [
      "How can I contact you?",
      "What do you do?",
      "What do you sell?",
      "How much is delivery?",
      "What payment methods do you accept?",
      "How do referrals work?",
    ],
  },
} as const;

export function AiSupportWorkspace({ locale, mode }: { locale: Locale; mode: SupportMode }) {
  const toast = useToast();
  const copy = COPY[locale];
  const transport = useMemo(
    () => new DefaultChatTransport<SupportMessage>({
      api: "/api/ai-support/chat",
      body: { locale },
    }),
    [locale]
  );
  const { messages, sendMessage, regenerate, stop, status, error, setMessages, clearError } =
    useChat<SupportMessage>({ transport, onError: (error) => toast.error(error.message) });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const userCount = messages.filter((message) => message.role === "user").length;
  const atLimit = userCount >= 10;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const submit = async (event?: FormEvent, suggestion?: string) => {
    event?.preventDefault();
    const text = (suggestion ?? input).trim();
    if (!text || busy || atLimit) return;
    clearError();
    setInput("");
    await sendMessage({ text });
  };

  const reset = () => {
    stop();
    clearError();
    setMessages([]);
    setInput("");
  };

  return (
    <main className="min-h-dvh bg-brand-950 text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-brand-900 p-5 lg:w-80 lg:border-r lg:border-b-0 lg:p-7">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <Link href={localizeHref(locale, "/")} className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent hover:text-accent-strong">
              ← {copy.back}
            </Link>
            <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${mode === "ai" ? "bg-action-fill text-on-action" : "border border-accent/40 bg-accent-soft text-accent-strong"}`}>
              {mode === "ai" ? copy.ai : copy.simulated}
            </span>
          </div>

          <div className="mt-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-accent-fill to-action-fill font-heading text-xl font-bold text-white shadow-accent">AI</div>
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-[-0.03em]">{copy.title}</h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">{copy.subtitle}</p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-xs leading-5 text-text-muted">
            {mode === "ai" ? copy.aiNote : copy.simulatedNote}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 lg:flex-col">
            <Link href={localizeHref(locale, "/loyalty")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action-fill px-4 text-sm font-semibold text-on-action hover:bg-action-strong">
              {copy.store}
            </Link>
            <button type="button" onClick={reset} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-text hover:border-accent">
              {copy.reset}
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col bg-bg lg:m-4 lg:ml-0 lg:rounded-[1.25rem] lg:border lg:border-border">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-3xl space-y-5" aria-live="polite">
              {messages.length === 0 ? (
                <div className="py-8 text-center sm:py-16">
                  <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-accent/30 bg-accent-soft text-2xl">✦</div>
                  <h2 className="mt-5 font-heading text-2xl font-semibold">{copy.welcome}</h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">{copy.welcomeDetail}</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {copy.prompts.map((prompt) => (
                      <button key={prompt} type="button" onClick={() => void submit(undefined, prompt)} className="min-h-20 rounded-2xl border border-border bg-surface p-4 text-left text-sm leading-5 text-text transition hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[76%] ${message.role === "user" ? "rounded-br-md bg-action-fill text-on-action" : "rounded-bl-md border border-border bg-surface text-text"}`}>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") return <p key={index} className="whitespace-pre-wrap">{part.text}</p>;
                      if (isToolUIPart(part)) return <p key={index} className="text-xs text-accent-strong">{copy.consulting}</p>;
                      return null;
                    })}
                  </div>
                </article>
              ))}

              {status === "submitted" ? <p className="text-sm text-text-muted">{copy.consulting}</p> : null}
              {error ? (
                <button type="button" onClick={() => void regenerate()} className="mt-3 min-h-10 rounded-xl bg-action-fill px-4 font-semibold text-on-action">{copy.retry}</button>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-border bg-brand-900/80 p-4 sm:p-6 lg:rounded-b-[1.25rem]">
            <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-accent">
                <textarea value={input} onChange={(event) => setInput(event.target.value.slice(0, 1000))} onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }} disabled={busy || atLimit} rows={1} maxLength={1000} placeholder={copy.placeholder} aria-label={copy.placeholder} className="min-h-11 max-h-36 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-muted disabled:opacity-50" />
                {busy ? (
                  <button type="button" onClick={stop} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-text">{copy.stop}</button>
                ) : (
                  <button type="submit" disabled={!input.trim() || atLimit} className="min-h-11 rounded-xl bg-action-fill px-5 text-sm font-semibold text-on-action disabled:cursor-not-allowed disabled:opacity-40">{copy.send}</button>
                )}
              </div>
              <div className="mt-2 flex justify-between gap-3 text-[11px] text-text-muted">
                <span>{atLimit ? copy.limit : copy.disclaimer}</span>
                <span className="tabular-nums">{input.length}/1000 · {userCount}/10</span>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
