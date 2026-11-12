"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { ReceiptPreviewDto, ScanReceiptDto } from "@/modules/receipts/application/dtos/receipt-dtos";
import type { ReceiptReading } from "@/modules/receipts/domain/services/verify-receipt";

/** A phone photo shrunk to this still reads well, and uploads in a moment on a mobile connection. */
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.9;
/**
 * Average brightness (0-255) under which a photo is too dark to read. A white
 * receipt on a dark table still averages well above it; a photo in a dim room
 * without flash does not.
 */
const DARK_BELOW = 60;

type ScanError = { code?: string; missing?: string[]; maxAgeDays?: number; retryAfterSeconds?: number; read?: ReceiptReading };
type State =
  | { kind: "idle" }
  | { kind: "dark"; photo: Blob }
  | { kind: "reading" }
  | { kind: "preview"; preview: ReceiptPreviewDto; confirming: boolean }
  | { kind: "done"; result: ScanReceiptDto; read?: ReceiptReading }
  | { kind: "error"; text: string; read?: ReceiptReading };

const PRIMARY =
  "min-h-12 w-full rounded-pill bg-accent-fill px-5 py-3 text-body font-semibold text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";
const SECONDARY =
  "min-h-12 w-full rounded-pill border border-border bg-surface px-5 py-3 text-body font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

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

/** The average brightness of a picture, from a 32-pixel thumbnail of it. Null if the browser cannot tell. */
function brightness(source: CanvasImageSource): number | null {
  const thumb = document.createElement("canvas");
  thumb.width = 32;
  thumb.height = 32;
  const context = thumb.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, 32, 32);
  const { data } = context.getImageData(0, 0, 32, 32);
  let sum = 0;
  for (let index = 0; index < data.length; index += 4) sum += 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
  return sum / (data.length / 4);
}

/**
 * A smaller JPEG with the photo's rotation already applied, and how bright it
 * is; the original, of unknown brightness, if the browser cannot do either.
 */
async function shrink(file: File): Promise<{ photo: Blob; brightness: number | null }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    return { photo: blob ?? file, brightness: brightness(canvas) };
  } catch {
    return { photo: file, brightness: null };
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
        es: `Ya registraste una visita hace poco. La próxima estará disponible en ${Math.ceil((error.retryAfterSeconds ?? 60) / 60)} min.`,
        en: `You recorded a visit recently. The next one will be available in ${Math.ceil((error.retryAfterSeconds ?? 60) / 60)} min.`,
      });
    case "stamps/reward-pending":
      return pick(locale, { es: "Tu premio ya está listo: canjéalo antes de sumar más visitas.", en: "Your reward is ready: redeem it before collecting more visits." });
    case "stamps/inactive":
      return pick(locale, { es: "El programa está en pausa por ahora.", en: "The program is paused for now." });
    case "receipts/confirmation-expired":
    case "receipts/confirmation-invalid":
      return pick(locale, { es: "Pasó mucho tiempo. Escanea el recibo otra vez.", en: "Too much time went by. Please scan the receipt again." });
    default:
      return pick(locale, { es: "No pudimos revisar tu recibo. Intenta de nuevo.", en: "We couldn't check your receipt. Please try again." });
  }
}

/**
 * The customer's button to photograph a receipt. It opens the phone's camera (or
 * a file picker on a computer), and everything about the receipt is decided on
 * the server from the picture. Nothing is earned until the customer sees the
 * total that was read and says it is right; if it is not, they take another photo.
 */
export function ReceiptScanner({ slug, onScanned }: { slug: string; onScanned?: () => void }) {
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  // Written as on the receipt, whatever the language: $3.11.
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const longDate = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const base = `/api/member/businesses/${encodeURIComponent(slug)}/receipts`;
  const offline = () =>
    setState({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });

  const takePhoto = () => input.current?.click();

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setState({ kind: "reading" });
    const { photo, brightness: light } = await shrink(file);
    if (light !== null && light < DARK_BELOW) setState({ kind: "dark", photo });
    else await read(photo);
  }

  async function read(photo: Blob) {
    setState({ kind: "reading" });
    try {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: photo });
      const body = (await response.json().catch(() => ({}))) as Partial<ReceiptPreviewDto> & { error?: ScanError };
      if (response.ok && body.token && body.earns && body.totalCents !== undefined && body.date) {
        setState({
          kind: "preview",
          confirming: false,
          preview: { totalCents: body.totalCents, date: body.date, earns: body.earns, token: body.token, read: body.read },
        });
      } else {
        setState({ kind: "error", text: errorText(locale, body.error), read: body.error?.read });
      }
    } catch {
      offline();
    }
  }

  async function confirm(preview: ReceiptPreviewDto) {
    setState({ kind: "preview", preview, confirming: true });
    try {
      const response = await fetch(`${base}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: preview.token }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<ScanReceiptDto> & { error?: ScanError };
      if (response.ok && body.reward && body.totalCents !== undefined && body.date) {
        setState({ kind: "done", result: { totalCents: body.totalCents, date: body.date, reward: body.reward }, read: preview.read });
        onScanned?.();
      } else {
        setState({ kind: "error", text: errorText(locale, body.error) });
      }
    } catch {
      offline();
    }
  }

  if (state.kind === "dark") {
    return (
      <section aria-label={pick(locale, { es: "La foto salió oscura", en: "The photo is too dark" })} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <input ref={input} type="file" accept="image/*" capture="environment" onChange={pickPhoto} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <p role="alert" className="text-body font-semibold text-text">
          {pick(locale, { es: "La foto salió muy oscura", en: "The photo came out too dark" })}
        </p>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "Así es difícil leer los números. Busca más luz o enciende el flash de la cámara y toma otra foto.",
            en: "The numbers are hard to read like this. Find more light or turn on the camera flash and take another photo.",
          })}
        </p>
        <button type="button" onClick={takePhoto} className={PRIMARY}>
          {pick(locale, { es: "Tomar otra foto", en: "Take another photo" })}
        </button>
        <button type="button" onClick={() => read(state.photo)} className={SECONDARY}>
          {pick(locale, { es: "Enviar esta de todos modos", en: "Send this one anyway" })}
        </button>
      </section>
    );
  }

  if (state.kind === "preview") {
    const { preview, confirming } = state;
    return (
      <section aria-label={pick(locale, { es: "Confirma tu recibo", en: "Confirm your receipt" })} className="flex flex-col gap-3">
        <input ref={input} type="file" accept="image/*" capture="environment" onChange={pickPhoto} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-4 py-5 text-center">
          <p className="text-body text-text-muted">{pick(locale, { es: "Leímos este total en tu recibo", en: "We read this total on your receipt" })}</p>
          <p className="text-[2.5rem] font-bold leading-tight tracking-tight text-text tabular-nums">{money.format(preview.totalCents / 100)}</p>
          <p className="text-body text-text-muted">{longDate.format(new Date(preview.date))}</p>
          <p className="mt-2 text-body font-medium text-accent-strong">
            {preview.earns.kind === "points"
              ? pick(locale, { es: `Ganarás ${preview.earns.points} puntos`, en: `You'll earn ${preview.earns.points} points` })
              : pick(locale, { es: "Sumará 1 visita a tu tarjeta", en: "It adds 1 visit to your card" })}
          </p>
        </div>
        <p className="text-center text-body font-semibold text-text">{pick(locale, { es: "¿Es correcto?", en: "Is this right?" })}</p>
        <button type="button" onClick={() => confirm(preview)} disabled={confirming} className={PRIMARY}>
          {confirming ? pick(locale, { es: "Guardando...", en: "Saving..." }) : pick(locale, { es: "Sí, es correcto", en: "Yes, that's right" })}
        </button>
        <button type="button" onClick={takePhoto} disabled={confirming} className={SECONDARY}>
          {pick(locale, { es: "No, tomar otra foto", en: "No, take another photo" })}
        </button>
        {preview.read && <ReadingCard read={preview.read} />}
      </section>
    );
  }

  return (
    <section aria-label={pick(locale, { es: "Escanear mi recibo", en: "Scan my receipt" })} className="flex flex-col gap-2">
      <input ref={input} type="file" accept="image/*" capture="environment" onChange={pickPhoto} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <button
        type="button"
        onClick={takePhoto}
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
                es: `¡Visita registrada! Recibo de ${money.format(state.result.totalCents / 100)}.`,
                en: `Visit recorded! ${money.format(state.result.totalCents / 100)} receipt.`,
              })}
        </p>
      )}
      {state.kind === "done" && state.read && <ReadingCard read={state.read} />}
    </section>
  );
}
