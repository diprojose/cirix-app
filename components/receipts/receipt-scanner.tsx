"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { ScanReceiptDto } from "@/modules/receipts/application/dtos/receipt-dtos";
import type { ReceiptReading } from "@/modules/receipts/domain/services/verify-receipt";

/** A phone photo shrunk to this still reads well, and uploads in a moment on a mobile connection. */
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.9;

type ScanError = { code?: string; missing?: string[]; maxAgeDays?: number; retryAfterSeconds?: number; read?: ReceiptReading };
type State =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "done"; result: ScanReceiptDto }
  | { kind: "error"; text: string; read?: ReceiptReading };

/** Demo mode: what came off the photo, field by field, so a sales demo can show the reading itself. */
function ReadingCard({ read }: { read: ReceiptReading }) {
  const locale = useLocale();
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const notRead = pick(locale, { es: "No se leyó", en: "Not read" });
  const rows: [string, string | null][] = [
    [pick(locale, { es: "Comercio", en: "Store" }), read.store],
    [pick(locale, { es: "Total", en: "Total" }), read.totalCents === null ? null : money.format(read.totalCents / 100)],
    [pick(locale, { es: "Fecha", en: "Date" }), read.date === null ? null : date.format(new Date(read.date))],
    [pick(locale, { es: "Hora", en: "Time" }), read.time],
    [pick(locale, { es: "N.º de transacción", en: "Transaction no." }), read.transactionId],
    [pick(locale, { es: "Autorización", en: "Authorization" }), read.authCode],
    [pick(locale, { es: "Merchant ID", en: "Merchant ID" }), read.merchantId],
  ];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left">
      <h3 className="text-label font-medium text-text">{pick(locale, { es: "Datos leídos del recibo", en: "Data read from the receipt" })}</h3>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-label">
            <dt className="shrink-0 text-text-muted">{label}</dt>
            <dd className={`min-w-0 break-words text-right ${value === null ? "text-text-muted" : "font-medium text-text"}`}>{value ?? notRead}</dd>
          </div>
        ))}
      </dl>
      {read.lines.length > 0 && (
        <details className="text-caption text-text-muted">
          <summary className="cursor-pointer underline underline-offset-4">{pick(locale, { es: "Ver todo el texto leído", en: "See all the text read" })}</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono">{read.lines.join("\n")}</pre>
        </details>
      )}
      <p className="text-caption text-text-muted">
        {pick(locale, {
          es: "Modo demo: se acepta cualquier recibo, sin revisar tienda, fecha ni repetidos.",
          en: "Demo mode: any receipt is accepted, without checking the store, date or repeats.",
        })}
      </p>
    </section>
  );
}

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
        setState({ kind: "done", result: { totalCents: body.totalCents, date: body.date, reward: body.reward, read: body.read } });
        onScanned?.();
      } else {
        setState({ kind: "error", text: errorText(locale, body.error), read: body.error?.read });
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
      {state.kind === "error" && state.read && <ReadingCard read={state.read} />}
      {state.kind === "done" && (
        <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-center text-body font-medium text-accent-strong">
          {state.result.reward.kind === "none"
            ? errorText(locale, { code: state.result.reward.code, retryAfterSeconds: state.result.reward.retryAfterSeconds ?? undefined })
            : state.result.reward.kind === "points"
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
      {state.kind === "done" && state.result.read && <ReadingCard read={state.result.read} />}
    </section>
  );
}
