"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { localizeHref, pick } from "@/lib/locale";

const INPUT =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60";

/**
 * The quick signup behind a business QR code: a name and an optional phone. The
 * email comes from the verified session on the server, so the person never
 * retypes it and cannot register somebody else's address.
 */
export function JoinForm({ slug, source, next }: { slug: string; source: "table_qr" | "web"; next: string }) {
  const locale = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source }),
      });
      if (response.ok) {
        window.location.assign(localizeHref(locale, next));
        return;
      }
      setError(
        response.status === 400
          ? pick(locale, {
              es: "Revisa tu nombre y tu teléfono (de 7 a 15 dígitos, o déjalo vacío).",
              en: "Check your name and phone (7 to 15 digits, or leave it empty).",
            })
          : pick(locale, {
              es: "No pudimos completar tu registro. Intenta de nuevo.",
              en: "We couldn't complete your signup. Please try again.",
            })
      );
    } catch {
      setError(pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }));
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-busy={loading}>
      <label htmlFor="join-name" className="text-label font-medium text-text">
        {pick(locale, { es: "Nombre", en: "Name" })}
      </label>
      <input
        id="join-name"
        name="name"
        autoComplete="name"
        required
        minLength={2}
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={loading}
        className={INPUT}
      />

      <label htmlFor="join-phone" className="text-label font-medium text-text">
        {pick(locale, { es: "Teléfono (opcional)", en: "Phone (optional)" })}
      </label>
      <input
        id="join-phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        maxLength={30}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        disabled={loading}
        className={INPUT}
      />

      {error && (
        <p role="alert" className="text-label text-text">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60"
      >
        {loading
          ? pick(locale, { es: "Registrando...", en: "Signing you up..." })
          : pick(locale, { es: "Unirme", en: "Join" })}
      </button>
    </form>
  );
}
