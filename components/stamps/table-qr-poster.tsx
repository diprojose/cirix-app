"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import { tableQrPath } from "@/lib/stamps/table-qr";

const BUTTON =
  "flex min-h-11 items-center justify-center rounded-pill px-5 py-2 text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

/**
 * The table QR, ready to print or download, plus the owner's control to replace
 * its code. The address uses the site the owner is on, so a QR printed from
 * production points at production.
 */
export function TableQrPoster({
  slug,
  businessName,
  initialCode,
  tableStamps,
}: {
  slug: string;
  businessName: string;
  initialCode: string;
  tableStamps: boolean;
}) {
  const locale = useLocale();
  const [code, setCode] = useState(initialCode);
  const [image, setImage] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const url = `${window.location.origin}${tableQrPath(slug, code)}`;
    void import("qrcode").then(({ toDataURL }) =>
      toDataURL(url, { errorCorrectionLevel: "Q", margin: 2, width: 1024 }).then((data) => {
        if (active) setImage(data);
      })
    );
    return () => {
      active = false;
    };
  }, [slug, code]);

  // Lets the owner try the scan from a computer, e.g. in a private window signed in as a customer.
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${tableQrPath(slug, code)}`);
      setMessage({ kind: "ok", text: pick(locale, { es: "Enlace copiado. Ábrelo en una ventana de incógnito con una cuenta de cliente.", en: "Link copied. Open it in a private window with a customer account." }) });
    } catch {
      setMessage({ kind: "error", text: pick(locale, { es: "No se pudo copiar el enlace.", en: "The link could not be copied." }) });
    }
  }

  async function rotate() {
    const confirmed = window.confirm(
      pick(locale, {
        es: "Los QR que ya imprimiste dejarán de dar sellos (para registrarse siguen sirviendo). Tendrás que imprimir y poner los nuevos. ¿Continuar?",
        en: "QR codes you already printed will stop giving stamps (they still work for signing up). You'll need to print and place the new ones. Continue?",
      })
    );
    if (!confirmed) return;
    setRotating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/member/biz/${encodeURIComponent(slug)}/table-code`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { code?: string };
      if (response.ok && body.code) {
        setImage(null);
        setCode(body.code);
        setMessage({ kind: "ok", text: pick(locale, { es: "Código cambiado. Imprime el QR nuevo.", en: "Code changed. Print the new QR." }) });
      } else {
        setMessage({ kind: "error", text: pick(locale, { es: "No se pudo cambiar el código.", en: "The code could not be changed." }) });
      }
    } catch {
      setMessage({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    }
    setRotating(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <figure className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-border bg-white p-6 text-center text-[#1c1917] print:max-w-none print:border-0">
        <figcaption className="flex flex-col gap-1">
          {/* The theme recolors text for dark mode; a printed poster is always dark on white. */}
          <span className="text-display font-bold tracking-tight text-[#1c1917]">{businessName}</span>
          <span className="text-body text-[#44403c]">
            {tableStamps
              ? pick(locale, { es: "Escanea para sumar tu sello", en: "Scan to collect your stamp" })
              : pick(locale, { es: "Escanea para unirte a nuestro programa", en: "Scan to join our program" })}
          </span>
        </figcaption>
        <div className="flex aspect-square w-full items-center justify-center">
          {image ? (
            <Image src={image} unoptimized width={512} height={512} className="size-full"
              alt={pick(locale, { es: `Código QR de mesa de ${businessName}`, en: `${businessName} table QR code` })} />
          ) : (
            <span role="status" className="text-label text-[#57534e]">
              {pick(locale, { es: "Generando el QR…", en: "Generating the QR…" })}
            </span>
          )}
        </div>
      </figure>

      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} disabled={!image}
          className={`${BUTTON} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}>
          {pick(locale, { es: "Imprimir", en: "Print" })}
        </button>
        {image && (
          <a href={image} download={`qr-mesa-${slug}.png`} className={`${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`}>
            {pick(locale, { es: "Descargar imagen", en: "Download image" })}
          </a>
        )}
        <button type="button" onClick={copyLink}
          className={`${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`}>
          {pick(locale, { es: "Copiar enlace", en: "Copy link" })}
        </button>
        <button type="button" onClick={rotate} disabled={rotating}
          className={`${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`}>
          {rotating ? pick(locale, { es: "Cambiando…", en: "Changing…" }) : pick(locale, { es: "Cambiar código", en: "Change code" })}
        </button>
      </div>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="text-center text-label text-text print:hidden">
          {message.text}
        </p>
      )}
    </div>
  );
}
