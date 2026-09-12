"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import s from "./toast.module.css";

type Toast = { id: number; message: string };
type ToastContextValue = { error: (message: string | null | undefined) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

/** One notification host for every route; call useToast().error in event handlers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const locale = useLocale();
  const error = useCallback((message: string | null | undefined) => {
    if (!message?.trim()) return;
    const toast = { id: ++nextId.current, message: message.trim() };
    // Repeated attempts refresh the notification instead of stacking duplicates.
    setToasts((current) => [...current.filter((item) => item.message !== toast.message), toast].slice(-3));
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const value = useMemo(() => ({ error }), [error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section className={s.viewport} aria-label={pick(locale, { es: "Notificaciones", en: "Notifications" })}>
        <ol className={s.list}>
          {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const locale = useLocale();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(() => dismiss(toast.id), 8000);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss, hovered, focused]);

  return (
    <li className={s.toast}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(toast.id); }}>
      <div className={s.content} role="alert" aria-atomic="true">
        <svg className={s.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" />
        </svg>
        <div>
          <p className={s.title}>{pick(locale, { es: "Ocurrió un error", en: "Something went wrong" })}</p>
          <p className={s.message}>{toast.message}</p>
        </div>
      </div>
      <button type="button" className={s.close} onClick={() => dismiss(toast.id)} aria-label={pick(locale, { es: "Cerrar notificación", en: "Dismiss notification" })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>
    </li>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}

/** Bridge for server-returned messages and errors derived during rendering. */
export function ErrorToast({ message }: { message?: string | null }) {
  const { error } = useToast();
  useEffect(() => { if (message) error(message); }, [message, error]);
  return null;
}
