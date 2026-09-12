"use client";

import { useToast } from "@/components/toast-provider";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import Link from "next/link";
import Image from "next/image";
import landing from "@/components/landing/landing.module.css";
import styles from "./ai-support-workspace.module.css";
import { localizeHref, type Locale } from "@/lib/locale";
import type { SupportMode } from "../application/public-commerce-knowledge";

type SupportMetadata = { mode: SupportMode };
type SupportMessage = UIMessage<SupportMetadata>;

const COPY = {
  es: {
    back: "Volver a módulos",
    home: "CIRIX — inicio",
    eyebrow: "ECOSISTEMA CIRIX / ASISTENCIA",
    intro: "Cada pregunta, un paso más cerca de tu próxima compra.",
    guide: "A TU LADO, EN CADA PASO",
    guideTitle: "Tus preguntas.",
    guideAccent: "Más posibilidades.",
    topics: ["Productos y catálogo", "Delivery y pagos", "Recompensas y referidos"],
    connected: "EXPLORA LA EXPERIENCIA",
    storeDetail: "Conoce los productos y descubre tus próximas recompensas.",
    session: "Conversación actual",
    ready: "Listo para ayudarte",
    suggestions: "ELIGE UNA PREGUNTA PARA COMENZAR",
    promptLabels: ["Hablemos", "Sobre CIRIX", "Catálogo", "Delivery", "Pagos", "Referidos"],
    you: "Tú",
    assistant: "Asistente CIRIX",
    messages: "mensajes",
    failed: "No pudimos completar la respuesta. Inténtalo de nuevo.",
    keyboard: "Enter para enviar · Shift + Enter para una nueva línea",
    footer: "Estrategia que conecta. Tecnología que impulsa.",
    store: "Abrir tienda",
    title: "Asistente de compras",
    subtitle: "Consulta el catálogo, delivery, pagos y el programa de recompensas.",
    simulated: "Modo simulado · 0 tokens",
    ai: "Modo IA · consumo activo",
    simulatedNote: "Las respuestas siguen reglas locales y datos del demo. No se realiza ninguna llamada a OpenAI.",
    aiNote: "La IA está habilitada manualmente. No compartas información personal o bancaria.",
    welcome: "Hola, ¿en qué puedo ayudarte hoy?",
    welcomeDetail: "Puedo orientarte sobre productos, precios, delivery, pagos, rewards y referidos.",
    placeholder: "Escribe una pregunta sobre la tienda...",
    send: "Enviar",
    stop: "Detener",
    reset: "Nueva conversación",
    retry: "Reintentar",
    consulting: "Consultando datos públicos...",
    limit: "Llegaste al límite de 10 mensajes de esta sesión.",
    disclaimer: "Demo de soporte. Verifica la información importante antes de comprar.",
    prompts: [
      "¿Cómo puedo contactarlos?",
      "¿Qué hacen?",
      "¿Qué venden?",
      "¿Cuánto cuesta el delivery?",
      "¿Qué métodos de pago aceptan?",
      "¿Cómo funcionan los referidos?",
    ],
  },
  en: {
    back: "Back to modules",
    home: "CIRIX — home",
    eyebrow: "CIRIX ECOSYSTEM / SUPPORT",
    intro: "Every question, a step closer to your next purchase.",
    guide: "BY YOUR SIDE, AT EVERY STEP",
    guideTitle: "Your questions.",
    guideAccent: "More possibilities.",
    topics: ["Products and catalog", "Delivery and payments", "Rewards and referrals"],
    connected: "EXPLORE THE EXPERIENCE",
    storeDetail: "Explore the products and discover your next rewards.",
    session: "Current conversation",
    ready: "Ready to help",
    suggestions: "CHOOSE A QUESTION TO GET STARTED",
    promptLabels: ["Let's talk", "About CIRIX", "Catalog", "Delivery", "Payments", "Referrals"],
    you: "You",
    assistant: "CIRIX assistant",
    messages: "messages",
    failed: "We couldn't complete the reply. Please try again.",
    keyboard: "Enter to send · Shift + Enter for a new line",
    footer: "Strategy that connects. Technology that drives.",
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
  const conversationRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const userCount = messages.filter((message) => message.role === "user").length;
  const atLimit = userCount >= 10;

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTo({
      top: messages.length > 0 ? conversation.scrollHeight : 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
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
    <div className={`${landing.landing} ${styles.workspace}`}>
      <a href="#support-input" className={landing.skipLink}>{copy.placeholder}</a>
      <header className={landing.header}>
        <div className={`${landing.container} ${landing.headerInner} ${styles.headerInner}`}>
          <Link href={localizeHref(locale, "/")} aria-label={copy.home}>
            <Image src="/brand/logo-white.svg" alt="CIRIX" width={128} height={46} className={landing.logo} />
          </Link>
          <span className={styles.headerLabel}>AI CUSTOMER SUPPORT</span>
          <Link href={localizeHref(locale, "/#soluciones")} className={landing.textButton}>
            <span aria-hidden="true">←</span> {copy.back}
          </Link>
        </div>
      </header>

      <main className={`${landing.container} ${styles.main}`}>
        <div className={styles.intro}>
          <div>
            <p className={landing.eyebrow}><span className={landing.statusDot} />{copy.eyebrow}</p>
            <h1>AI Customer <span>Support.</span></h1>
            <p className={styles.introDescription}>{copy.intro}</p>
          </div>
          <div className={styles.mode}>
            <span className={styles.modeDot} aria-hidden="true" />
            {mode === "ai" ? copy.ai : copy.simulated}
          </div>
        </div>

        <div className={styles.workbench}>
          <aside className={styles.sidebar}>
            <div className={styles.guide}>
              <p className={landing.eyebrow}>{copy.guide}</p>
              <h2>{copy.guideTitle}<br /><span>{copy.guideAccent}</span></h2>
              <p className={styles.description}>{copy.subtitle}</p>
              <ul className={styles.topics}>
                {copy.topics.map((topic, index) => (
                  <li key={topic}><span className={styles.topicNumber}>0{index + 1}</span>{topic}<span aria-hidden="true">↗</span></li>
                ))}
              </ul>
            </div>
            <div className={styles.storeCard}>
              <p className={landing.eyebrow}>{copy.connected}</p>
              <h3>Loyalty Commerce</h3>
              <p className={styles.description}>{copy.storeDetail}</p>
              <Link href={localizeHref(locale, "/loyalty")} className={`${landing.primaryButton} ${styles.storeButton}`}>
                {copy.store}<span aria-hidden="true">↗</span>
              </Link>
            </div>
            <p className={styles.modeNote}><span className={landing.noteLine} aria-hidden="true" />{mode === "ai" ? copy.aiNote : copy.simulatedNote}</p>
          </aside>

          <section className={styles.chat} aria-labelledby="chat-title">
            <header className={styles.chatHeader}>
              <div className={styles.assistantIdentity}>
                <span className={styles.avatar} aria-hidden="true"><SupportIcon /></span>
                <div><h2 id="chat-title">{copy.title}</h2><p><span className={styles.modeDot} aria-hidden="true" />{busy ? copy.consulting : copy.ready}</p></div>
              </div>
              <button type="button" onClick={reset} className={styles.resetButton}>
                <span aria-hidden="true">＋</span><span>{copy.reset}</span>
              </button>
            </header>

            <div ref={conversationRef} className={styles.conversation} role="log" aria-label={copy.session} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.welcomeSymbol} aria-hidden="true"><SupportIcon /></div>
                  <h3>{copy.welcome}</h3>
                  <p className={styles.welcomeDetail}>{copy.welcomeDetail}</p>
                  <p className={styles.suggestionsLabel}>{copy.suggestions}</p>
                  <div className={styles.prompts}>
                    {copy.prompts.map((prompt, index) => (
                      <button key={prompt} type="button" disabled={busy || atLimit} onClick={() => void submit(undefined, prompt)} className={styles.prompt}>
                        <span className={styles.promptHeading}><span>{copy.promptLabels[index]}</span><span aria-hidden="true">↗</span></span>
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.messageList}>
                  <p className={styles.conversationLabel}>{copy.session}</p>
                  {messages.map((message) => (
                    <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
                      <span className={styles.messageAuthor}>{message.role === "user" ? copy.you : copy.assistant}</span>
                      <div className={styles.bubble}>
                        {message.parts.map((part, index) => {
                          if (part.type === "text") return <p key={index}>{part.text}</p>;
                          if (isToolUIPart(part)) return <p key={index} className={styles.toolStatus}>{copy.consulting}</p>;
                          return null;
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {status === "submitted" ? <p className={styles.loading}><span aria-hidden="true">•••</span>{copy.consulting}</p> : null}
              {error ? (
                <div className={styles.error} role="alert"><p>{copy.failed}</p><button type="button" onClick={() => void regenerate()} disabled={busy}>{copy.retry}<span aria-hidden="true">↗</span></button></div>
              ) : null}
            </div>

            <div className={styles.composer}>
              <form onSubmit={(event) => void submit(event)}>
                <div className={styles.inputRow}>
                  <textarea id="support-input" value={input} onChange={(event) => setInput(event.target.value.slice(0, 1000))} onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void submit();
                    }
                  }} disabled={busy || atLimit} rows={2} maxLength={1000} placeholder={copy.placeholder} aria-label={copy.placeholder} aria-describedby="support-disclaimer" />
                  {busy ? (
                    <button type="button" onClick={stop} className={styles.sendButton}>{copy.stop}<span aria-hidden="true">■</span></button>
                  ) : (
                    <button type="submit" disabled={!input.trim() || atLimit} className={styles.sendButton}>{copy.send}<span aria-hidden="true">↗</span></button>
                  )}
                </div>
                <div className={styles.inputMeta}><span className={styles.keyboardHint}>{copy.keyboard}</span><span>{input.length}/1000</span></div>
                <div className={styles.disclaimer}>
                  <p id="support-disclaimer" role={atLimit ? "status" : undefined}>{atLimit ? copy.limit : copy.disclaimer}</p>
                  <span>{userCount}/10 {copy.messages}</span>
                </div>
              </form>
            </div>
          </section>
        </div>
        <footer className={styles.footer}><span>© {new Date().getFullYear()} CIRIX</span><span>{copy.footer}</span><span>AI CUSTOMER SUPPORT</span></footer>
      </main>
    </div>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="m16 3 3.5 9.5L29 16l-9.5 3.5L16 29l-3.5-9.5L3 16l9.5-3.5L16 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M25 3v6M22 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
