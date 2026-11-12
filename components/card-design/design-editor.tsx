"use client";

/* eslint-disable @next/next/no-img-element -- previews of the owner's own pictures, already sized by our API. */
import { useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import { cardInk, STAMP_ICONS, type CardDesign, type CardImageKind } from "@/modules/card-design/domain/card-design";
import type { CardDesignDto, CardLook } from "@/modules/card-design/application/card-design-use-cases";
import { CardFace, StampGrid } from "./card-face";
import { brandStyle } from "./brand-style";
import { StampIcon, STAMP_ICON_LABELS } from "./stamp-icons";

/** Colours that suit most businesses, each with good contrast for the card's text. */
const SWATCHES = ["#1c5aae", "#0f766e", "#2e7d32", "#c62828", "#d84315", "#ef6c00", "#f9a825", "#ad1457", "#6a1b9a", "#5d4037", "#16181b", "#f4ead5"];

/** Longest side a picture is shrunk to before upload: enough for the card, quick on a phone connection. */
const UPLOAD_SIDE: Record<CardImageKind, number> = { logo: 1200, cover: 2000, stamp: 600 };

/** A picture as a smaller file: PNG where transparency matters (logo, stamp), JPEG for the photo. */
async function shrink(file: File, kind: CardImageKind): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, UPLOAD_SIDE[kind] / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = kind === "cover" ? "image/jpeg" : "image/png";
    return (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))) ?? file;
  } catch {
    return file;
  }
}

type Status = { kind: "idle" | "saving" | "saved" } | { kind: "error"; text: string };

/**
 * The owner's screen to dress the card: colour, logo, cover photo and, at a
 * restaurant, the picture each visit leaves. The card beside it changes as they
 * choose, exactly as customers will see it once saved.
 */
export function DesignEditor({
  slug,
  businessId,
  businessName,
  kind,
  initial,
  sample,
}: {
  slug: string;
  businessId: string;
  businessName: string;
  kind: "restaurant" | "supermarket";
  initial: CardDesignDto;
  /** What the preview card shows: the real reward and goal at a restaurant. */
  sample: { rewardName: string; required: number };
}) {
  const locale = useLocale();
  const [design, setDesign] = useState<CardDesign>(initial.design);
  const [saved, setSaved] = useState<CardDesign>(initial.design);
  const [uploading, setUploading] = useState<CardImageKind | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const stampInput = useRef<HTMLInputElement>(null);
  const api = `/api/member/biz/${encodeURIComponent(slug)}/design`;
  const url = (id: string) => `/api/card-images/${businessId}/${id}`;

  const look: CardLook = {
    color: design.color,
    ink: cardInk(design.color),
    logoUrl: design.logoId ? url(design.logoId) : null,
    coverUrl: design.coverId ? url(design.coverId) : null,
    stamp: design.stamp.kind === "icon" ? design.stamp : { kind: "image", url: url(design.stamp.imageId) },
  };
  const changed = JSON.stringify(design) !== JSON.stringify(saved);
  const update = (next: Partial<CardDesign>) => {
    setDesign((current) => ({ ...current, ...next }));
    setStatus({ kind: "idle" });
  };

  async function upload(imageKind: CardImageKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(imageKind);
    setStatus({ kind: "idle" });
    try {
      const response = await fetch(`${api}/images?kind=${imageKind}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: await shrink(file, imageKind),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; error?: { code?: string } };
      if (!response.ok || !body.id) {
        setStatus({
          kind: "error",
          text:
            body.error?.code === "card-design/too-many-images"
              ? pick(locale, { es: "Guarda el diseño antes de subir más imágenes.", en: "Save the design before uploading more pictures." })
              : pick(locale, { es: "No pudimos usar esa imagen. Prueba con otra (PNG o JPG).", en: "We couldn't use that picture. Try another one (PNG or JPG)." }),
        });
        return;
      }
      const id = body.id;
      if (imageKind === "logo") update({ logoId: id });
      else if (imageKind === "cover") update({ coverId: id });
      else update({ stamp: { kind: "image", imageId: id } });
    } catch {
      setStatus({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setStatus({ kind: "saving" });
    try {
      const response = await fetch(api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(design) });
      if (!response.ok) throw new Error("save failed");
      setSaved(design);
      setStatus({ kind: "saved" });
    } catch {
      setStatus({ kind: "error", text: pick(locale, { es: "No se pudo guardar. Intenta de nuevo.", en: "Could not save. Please try again." }) });
    }
  }

  const restaurant = kind === "restaurant";
  const preview = (
    <CardFace
      look={look}
      businessName={businessName}
      ariaLabel={pick(locale, { es: "Vista previa de la tarjeta", en: "Card preview" })}
      label={restaurant ? pick(locale, { es: "Visitas", en: "Visits" }) : pick(locale, { es: "Puntos", en: "Points" })}
      value={restaurant ? `${Math.min(3, sample.required)} / ${sample.required}` : "120"}
      fields={[
        restaurant
          ? { label: pick(locale, { es: "Premio", en: "Reward" }), value: sample.rewardName }
          : { label: pick(locale, { es: "Ganas", en: "You earn" }), value: pick(locale, { es: "Puntos por compra", en: "Points per purchase" }) },
        { label: pick(locale, { es: "Nombre", en: "Name" }), value: "Ana" },
      ]}
    >
      {restaurant ? (ink) => <StampGrid look={look} ink={ink} required={sample.required} stamps={Math.min(3, sample.required)} /> : undefined}
    </CardFace>
  );

  const button =
    "inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-surface px-4 py-2 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60";
  const pictureRow = (imageKind: "logo" | "cover", input: RefObject<HTMLInputElement | null>, title: string, hint: string, current: string | null, clear: () => void) => (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-body font-semibold text-text">{title}</h2>
        <p className="text-label text-text-muted">{hint}</p>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => upload(imageKind, event)} />
      <div className="flex flex-wrap items-center gap-3">
        {current && (
          <span className="grid h-14 w-24 place-items-center overflow-hidden rounded-lg border border-border" style={{ backgroundColor: design.color }}>
            <img src={current} alt="" className={imageKind === "cover" ? "h-full w-full object-cover" : "max-h-10 max-w-20 object-contain"} />
          </span>
        )}
        <button type="button" className={button} disabled={uploading !== null} onClick={() => input.current?.click()}>
          {uploading === imageKind
            ? pick(locale, { es: "Subiendo...", en: "Uploading..." })
            : current
              ? pick(locale, { es: "Cambiar", en: "Change" })
              : pick(locale, { es: "Subir imagen", en: "Upload picture" })}
        </button>
        {current && (
          <button type="button" className="min-h-11 px-2 text-label font-medium text-text-muted underline underline-offset-4" onClick={clear}>
            {pick(locale, { es: "Quitar", en: "Remove" })}
          </button>
        )}
      </div>
    </section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div style={brandStyle(design.color)} className="lg:order-2 lg:sticky lg:top-6 flex flex-col gap-2">
        <p className="text-label font-medium text-text-muted">{pick(locale, { es: "Así la verán tus clientes", en: "How your customers will see it" })}</p>
        {preview}
        {/* The customer's buttons and links take the same colour as the card. */}
        <div aria-hidden="true" className="mt-2 flex items-center gap-3">
          <span className="flex min-h-11 flex-1 items-center justify-center rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent">
            {pick(locale, { es: "Escanear recibo", en: "Scan receipt" })}
          </span>
          <span className="text-label font-medium text-accent underline underline-offset-4">{pick(locale, { es: "Ver premios", en: "See rewards" })}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:order-1">
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-body font-semibold text-text">{pick(locale, { es: "Color de la tarjeta", en: "Card colour" })}</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={pick(locale, { es: "Color de la tarjeta", en: "Card colour" })}>
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={design.color === swatch}
                aria-label={swatch}
                onClick={() => update({ color: swatch })}
                style={{ backgroundColor: swatch }}
                className={`size-11 rounded-full border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  design.color === swatch ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : ""
                }`}
              />
            ))}
          </div>
          <label className="flex items-center gap-3 text-label text-text">
            <input type="color" value={design.color} onChange={(event) => update({ color: event.target.value.toLowerCase() })} className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-surface" />
            {pick(locale, { es: "Otro color (el de tu marca)", en: "Another colour (your brand's)" })}
          </label>
        </section>

        {pictureRow(
          "logo",
          logoInput,
          pick(locale, { es: "Logo", en: "Logo" }),
          pick(locale, { es: "Se ve mejor un PNG con fondo transparente.", en: "A PNG with a transparent background looks best." }),
          look.logoUrl,
          () => update({ logoId: null })
        )}
        {pictureRow(
          "cover",
          coverInput,
          pick(locale, { es: "Foto de portada (opcional)", en: "Cover photo (optional)" }),
          pick(locale, { es: "Una foto de tu local o de tus productos. Va detrás de las visitas.", en: "A photo of your place or your products. It goes behind the visits." }),
          look.coverUrl,
          () => update({ coverId: null })
        )}

        {restaurant && (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-body font-semibold text-text">{pick(locale, { es: "Icono de las visitas", en: "Visit icon" })}</h2>
              <p className="text-label text-text-muted">{pick(locale, { es: "Lo que aparece en la tarjeta con cada visita.", en: "What appears on the card with each visit." })}</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-2" role="radiogroup" aria-label={pick(locale, { es: "Icono de las visitas", en: "Visit icon" })}>
              {STAMP_ICONS.map((name) => {
                const chosen = design.stamp.kind === "icon" && design.stamp.name === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => update({ stamp: { kind: "icon", name } })}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      chosen ? "border-accent bg-accent-subtle font-semibold text-accent-strong" : "border-border text-text-muted hover:bg-stone-50"
                    }`}
                  >
                    <StampIcon name={name} className="size-7" />
                    {pick(locale, STAMP_ICON_LABELS[name])}
                  </button>
                );
              })}
            </div>
            <input ref={stampInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => upload("stamp", event)} />
            <div className="flex flex-wrap items-center gap-3">
              {design.stamp.kind === "image" && (
                <span className="grid size-14 place-items-center rounded-xl border border-accent bg-accent-subtle">
                  <img src={url(design.stamp.imageId)} alt="" className="size-10 object-contain" />
                </span>
              )}
              <button type="button" className={button} disabled={uploading !== null} onClick={() => stampInput.current?.click()}>
                {uploading === "stamp"
                  ? pick(locale, { es: "Subiendo...", en: "Uploading..." })
                  : pick(locale, { es: "Subir mi propio icono", en: "Upload my own icon" })}
              </button>
            </div>
            <p className="text-caption text-text-muted">
              {pick(locale, {
                es: "Por ejemplo, tu producto estrella en PNG con fondo transparente. Las visitas que faltan se ven en gris.",
                en: "For example, your signature product as a PNG with a transparent background. Visits still to come show in grey.",
              })}
            </p>
          </section>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!changed || status.kind === "saving" || uploading !== null}
            className="min-h-12 w-full rounded-pill bg-accent-fill px-5 py-3 text-body font-semibold text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50"
          >
            {status.kind === "saving" ? pick(locale, { es: "Guardando...", en: "Saving..." }) : pick(locale, { es: "Guardar diseño", en: "Save design" })}
          </button>
          {status.kind === "saved" && (
            <p role="status" className="text-center text-label font-medium text-accent-strong">
              {pick(locale, { es: "Listo. Tus clientes ya ven la tarjeta nueva.", en: "Done. Your customers now see the new card." })}
            </p>
          )}
          {status.kind === "error" && (
            <p role="alert" className="text-center text-label font-medium text-danger">
              {status.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
