"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { ScanReceiptDto } from "@/modules/receipts/application/dtos/receipt-dtos";

/** A phone photo shrunk to this still reads well, and uploads in a moment on a mobile connection. */
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.9;

type ScanError = { code?: string; missing?: string[]; maxAgeDays?: number; retryAfterSeconds?: number };
type State =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "done"; result: ScanReceiptDto }
  | { kind: "error"; text: string };

/** Sends a smaller JPEG with the photo's rotation already applied; the original if the browser cannot. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    return blob ?? file;
  } catch {
    return file;
  }
}

function errorText(locale: Locale, error: ScanError | undefined): string {
  switch (error?.code) {
    case "receipts/unreadable": {
      const missing = (error.missing ?? []).map((field) =>
        field === "total"
          ? pick(locale, { es: "el total", en: "the total" })
          : field === "date"
            ? pick(locale, { es: "la fecha", en: "the date" })
            : pick(locale, { es: "el número del recibo", en: "the receipt number" })
      );
      return pick(locale, {
        es: `No pudimos leer ${missing.join(" ni ")}. Toma la foto de frente, con buena luz y con todo el recibo a la vista.`,
        en: `We couldn't read ${missing.join(" or ")}. Take the photo straight on, in good light, with the whole receipt in view.`,
      });
    }
    case "receipts/wrong-store":
      return pick(locale, {
        es: "Este recibo no parece ser de este negocio. Si lo es, tómale otra foto donde se vea bien el nombre.",
        en: "This receipt doesn't look like it's from this business. If it is, take another photo with the name clearly visible.",
      });
    case "receipts/out-of-date":
      return pick(locale, {
        es: `Este recibo es muy antiguo: solo valen los de los últimos ${error.maxAgeDays} días.`,
        en: `This receipt is too old: only those from the last ${error.maxAgeDays} days count.`,
      });
    case "receipts/already-used":
      return pick(locale, { es: "Este recibo ya se usó. Cada recibo vale una sola vez.", en: "This receipt was already used. Each receipt counts once." });
    case "receipts/amount-too-high":
      return pick(locale, { es: "No podemos aceptar este recibo automáticamente. Consúltalo con el personal.", en: "We can't accept this receipt automatically. Please ask the staff." });
    case "receipts/daily-limit":
      return pick(locale, { es: "Ya usaste todos los recibos permitidos por hoy. Vuelve mañana.", en: "You've used all the receipts allowed today. Come back tomorrow." });
    case "receipts/too-many-attempts":
      return pick(locale, { es: "Demasiados intentos por hoy. Vuelve a probar mañana.", en: "Too many attempts today. Try again tomorrow." });
    case "receipts/invalid-image":
      return pick(locale, { es: "No pudimos abrir esa imagen. Prueba con otra foto.", en: "We couldn't open that image. Try another photo." });
    case "receipts/disabled":
      return pick(locale, { es: "Este negocio no está recibiendo recibos por ahora.", en: "This business isn't accepting receipts right now." });
    case "stamps/too-soon":
      return pick(locale, {
        es: `Ya sumaste un sello hace poco. El próximo estará disponible en ${Math.ceil((error.retryAfterSeconds ?? 60) / 60)} min.`,
        en: `You got a stamp recently. The next one will be available in ${Math.ceil((error.retryAfterSeconds ?? 60) / 60)} min.`,
      });
    case "stamps/reward-pending":
      return pick(locale, { es: "Tu premio ya está listo: canjéalo antes de sumar más sellos.", en: "Your reward is ready: redeem it before collecting more stamps." });
    case "stamps/inactive":
      return pick(locale, { es: "El programa está en pausa por ahora.", en: "The program is paused for now." });
    default:
      return pick(locale, { es: "No pudimos revisar tu recibo. Intenta de nuevo.", en: "We couldn't check your receipt. Please try again." });
  }
}

/**
 * The customer's button to photograph a receipt. It opens the phone's camera (or
 * a file picker on a computer), and everything about the receipt is decided on
 * the server from the picture.
 */
export function ReceiptScanner({ slug, onScanned }: { slug: string; onScanned?: () => void }) {
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  // Written as on the receipt, whatever the language: $3.11.
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  async function send(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setState({ kind: "reading" });
    try {
      const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: await shrink(file),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<ScanReceiptDto> & { error?: ScanError };
      if (response.ok && body.reward && body.totalCents !== undefined && body.date) {
        setState({ kind: "done", result: { totalCents: body.totalCents, date: body.date, reward: body.reward } });
        onScanned?.();
      } else {
        setState({ kind: "error", text: errorText(locale, body.error) });
      }
    } catch {
      setState({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    }
  }

  return (
    <section aria-label={pick(locale, { es: "Escanear mi recibo", en: "Scan my receipt" })} className="flex flex-col gap-2">
      <input ref={input} type="file" accept="image/*" capture="environment" onChange={send} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={state.kind === "reading"}
        className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60"
      >
        {state.kind === "reading"
          ? pick(locale, { es: "Leyendo tu recibo...", en: "Reading your receipt..." })
          : pick(locale, { es: "Escanear mi recibo", en: "Scan my receipt" })}
      </button>

      {state.kind === "idle" && (
        <p className="text-center text-caption text-text-muted">
          {pick(locale, {
            es: "Toma la foto de frente, con buena luz y con todo el recibo a la vista.",
            en: "Take the photo straight on, in good light, with the whole receipt in view.",
          })}
        </p>
      )}
      {state.kind === "reading" && (
        <p role="status" className="text-center text-caption text-text-muted">
          {pick(locale, { es: "Esto toma unos segundos.", en: "This takes a few seconds." })}
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-label text-text">
          {state.text}
        </p>
      )}
      {state.kind === "done" && (
        <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-center text-body font-medium text-accent-strong">
          {state.result.reward.kind === "points"
            ? pick(locale, {
                es: `¡Listo! Recibo de ${money.format(state.result.totalCents / 100)}: ganaste ${state.result.reward.earned} puntos.`,
                en: `Done! ${money.format(state.result.totalCents / 100)} receipt: you earned ${state.result.reward.earned} points.`,
              })
            : pick(locale, {
                es: `¡Sello sumado! Recibo de ${money.format(state.result.totalCents / 100)}.`,
                en: `Stamp added! ${money.format(state.result.totalCents / 100)} receipt.`,
              })}
        </p>
      )}
    </section>
  );
}
