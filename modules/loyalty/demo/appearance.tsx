"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  validateBrandProfile,
  type BrandProfile,
} from "../branding/application/brand-profile";
import { themeVariables } from "../branding/ui/brand-theme";
import {
  STORE_PALETTES,
  PALETTE_KEYS,
  applyPalette,
  matchingPalette,
  type PaletteFamily,
} from "./palettes";
import { useDemo } from "./provider";
import { ProductCard, s } from "./ui";

const paletteFields = [
  [
    "primaryColor",
    "Principal",
    "Primary",
    "Botones, enlaces y selección",
    "Buttons, links and selection",
  ],
  [
    "secondaryColor",
    "Secundario",
    "Secondary",
    "Beneficios y detalles de marca",
    "Rewards and brand details",
  ],
  [
    "accentColor",
    "Promociones",
    "Promotions",
    "Ofertas y acentos puntuales",
    "Offers and occasional accents",
  ],
  [
    "backgroundColor",
    "Fondo",
    "Background",
    "Fondo general de la tienda",
    "Overall store background",
  ],
  [
    "surfaceColor",
    "Superficies",
    "Surfaces",
    "Tarjetas, formularios y paneles",
    "Cards, forms and panels",
  ],
] as const;
const paletteFamilies = [
  ["all", "Todas", "All"],
  ["natural", "Naturales", "Natural"],
  ["warm", "Cálidas", "Warm"],
  ["vivid", "Coloridas", "Colorful"],
  ["dark", "Oscuras", "Dark"],
] as const;
export function Appearance() {
  const { state, dispatch, t } = useDemo();
  const [draft, setDraft] = useState<BrandProfile>(state.brand);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [family, setFamily] = useState<PaletteFamily | "all">("all");
  const selectedPalette = matchingPalette(draft);
  const validation = validateBrandProfile({ ...draft, logoUrl: "" });
  const preview = validation.ok ? draft : state.brand;
  function update(key: keyof BrandProfile, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage("");
    setError("");
  }
  async function logoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setError(
        t(
          "Usa PNG, JPG o WebP de hasta 1 MB.",
          "Use PNG, JPG or WebP up to 1 MB.",
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const bitmap = await createImageBitmap(file);
        bitmap.close();
        update("logoUrl", String(reader.result));
      } catch {
        setError(
          t(
            "El archivo no contiene una imagen válida.",
            "The file does not contain a valid image.",
          ),
        );
      }
    };
    reader.onerror = () =>
      setError(t("No se pudo leer el archivo.", "Could not read the file."));
    reader.readAsDataURL(file);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    const failure = dispatch({
      type: "brand",
      brand: { ...draft, updatedAt: new Date().toISOString() },
    });
    if (failure) setError(failure);
    else {
      setError("");
      setMessage(
        t(
          "Apariencia aplicada a toda tu tienda demo.",
          "Appearance applied throughout your demo store.",
        ),
      );
    }
  }
  return (
    <div className={s.editorGrid}>
      <form
        id="demo-appearance-form"
        className={`${s.panel} ${s.form}`}
        onSubmit={save}
      >
        <h2>{t("Tu marca, tu mercado", "Your brand, your market")}</h2>
        <p className={s.muted}>
          {t(
            "Cambia la identidad sin tocar código. Revisa la vista previa y guarda para aplicarla a todas las pantallas.",
            "Change your brand without code. Review the preview and save to apply it across all screens.",
          )}
        </p>
        <label>
          {t("Nombre de la tienda", "Store name")}
          <input
            value={draft.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            required
            maxLength={60}
          />
        </label>
        <label>
          {t("Eslogan", "Tagline")}
          <input
            value={draft.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            maxLength={100}
          />
        </label>
        <label>
          Logo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={logoUpload}
          />
        </label>
        <p className={s.muted}>
          {t(
            "PNG, JPG o WebP · máximo 1 MB. Recomendado: fondo transparente.",
            "PNG, JPG or WebP · up to 1 MB. Transparent backgrounds work best.",
          )}
        </p>
        {draft.logoUrl && (
          <button
            type="button"
            className={s.secondary}
            onClick={() => update("logoUrl", "")}
          >
            {t("Quitar logo y usar nombre", "Remove logo and use name")}
          </button>
        )}
        <fieldset>
          <legend>
            {t("Paletas listas para usar", "Ready-to-use palettes")}
          </legend>
          <p className={s.muted}>
            {t(
              "15 combinaciones de color. Prueba una y personaliza cada tono a tu gusto.",
              "15 color combinations. Try one and customize every shade.",
            )}
          </p>
          <div
            className={s.paletteFilters}
            role="group"
            aria-label={t("Filtrar paletas", "Filter palettes")}
          >
            {paletteFamilies.map(([id, es, en]) => (
              <button
                type="button"
                key={id}
                aria-pressed={family === id}
                onClick={() => setFamily(id)}
              >
                {t(es, en)}
              </button>
            ))}
          </div>
          <div className={s.paletteGrid}>
            {STORE_PALETTES.filter(
              (p) => family === "all" || p.family === family,
            ).map((p) => (
              <button
                type="button"
                className={s.preset}
                key={p.id}
                aria-pressed={selectedPalette?.id === p.id}
                onClick={() => {
                  setDraft((d) => applyPalette(d, p));
                  setMessage("");
                  setError("");
                }}
              >
                <span className={s.paletteSwatches} aria-hidden="true">
                  {PALETTE_KEYS.map((key) => (
                    <span key={key} style={{ background: p.colors[key] }} />
                  ))}
                </span>
                <span className={s.paletteName}>
                  {t(p.name.es, p.name.en)}{" "}
                  <span aria-hidden="true">
                    {selectedPalette?.id === p.id ? "✓" : ""}
                  </span>
                </span>
                <span className={s.paletteDescription}>
                  {t(p.description.es, p.description.en)}
                </span>
              </button>
            ))}
          </div>
          <p className={s.paletteSelection} role="status">
            {t("Selección:", "Selection:")}{" "}
            {selectedPalette
              ? t(selectedPalette.name.es, selectedPalette.name.en)
              : t("Personalizada", "Custom")}
            <span>
              {t(
                "Guarda para aplicar a la tienda.",
                "Save to apply to your store.",
              )}
            </span>
          </p>
        </fieldset>
        {paletteFields.map(([key, es, en, helpEs, helpEn]) => (
          <div key={key}>
            <label htmlFor={`hex-${key}`}>{t(es, en)}</label>
            <p className={s.muted}>{t(helpEs, helpEn)}</p>
            <div className={s.colorRow}>
              <input
                aria-label={t(
                  `Seleccionar color ${es.toLowerCase()}`,
                  `Select ${en.toLowerCase()} color`,
                )}
                type="color"
                value={
                  /^#[\da-f]{6}$/i.test(draft[key]) ? draft[key] : "#000000"
                }
                onChange={(e) => update(key, e.target.value)}
              />
              <input
                id={`hex-${key}`}
                value={draft[key]}
                onChange={(e) => update(key, e.target.value)}
                required
                pattern="#[a-fA-F0-9]{6}"
                maxLength={7}
                spellCheck={false}
              />
            </div>
          </div>
        ))}
        <p className={s.infoBox}>
          {t(
            "Texto, foco y estados se ajustan automáticamente para mantener el contraste. Error, éxito y advertencia conservan su significado.",
            "Text, focus and interaction states adjust automatically for contrast. Error, success and warning keep their meaning.",
          )}
        </p>
        {!validation.ok && (
          <p role="status" className={s.error}>
            {validation.error}
          </p>
        )}
        <label>
          {t("Título principal", "Hero title")}
          <input
            value={draft.heroTitle}
            onChange={(e) => update("heroTitle", e.target.value)}
            maxLength={90}
            required
          />
        </label>
        <label>
          {t("Descripción principal", "Hero description")}
          <textarea
            value={draft.heroSubtitle}
            onChange={(e) => update("heroSubtitle", e.target.value)}
            maxLength={180}
          />
        </label>
        <div className={s.actions}>
          <button className={s.primary} disabled={!validation.ok}>
            {t("Guardar apariencia", "Save appearance")}
          </button>
          <button
            type="button"
            className={s.secondary}
            onClick={() => {
              setDraft(state.brand);
              setMessage("");
              setError("");
            }}
          >
            {t("Descartar cambios", "Discard changes")}
          </button>
        </div>
        {message && (
          <p className={s.success} role="status">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
      </form>
      <aside className={s.preview}>
        <p className={s.eyebrow}>{t("VISTA PREVIA EN VIVO", "LIVE PREVIEW")}</p>
        <div className={s.previewFrame} style={themeVariables(preview)}>
          {preview.logoUrl ? (
            <Image
              className={s.logoImage}
              src={preview.logoUrl}
              alt={preview.displayName}
              width={160}
              height={64}
              unoptimized
            />
          ) : (
            <b className={s.logo}>{preview.displayName}</b>
          )}
          <div className={s.previewHero}>
            <h3>{preview.heroTitle}</h3>
            <p>{preview.heroSubtitle}</p>
            <span className={s.heroButton}>
              {t("Hacer mi compra", "Start shopping")} →
            </span>
          </div>
          <span className={s.offerTag} style={{ position: "static" }}>
            {t("Oferta", "Offer")}
          </span>
          <p className={s.rewardNotice}>
            {t("Tus recompensas se ven así", "Your rewards look like this")}
          </p>
          {state.products[0] && (
            <ProductCard product={state.products[0]} preview />
          )}
        </div>
        <p className={s.finePrint}>
          {t(
            "La vista previa muestra tu borrador; si no es válido, muestra la apariencia guardada. Los cambios se guardan solo en este navegador.",
            "The preview shows your draft, or your saved appearance when the draft is invalid. Changes are saved only in this browser.",
          )}
        </p>
        <button
          type="submit"
          form="demo-appearance-form"
          className={s.previewSave}
          disabled={!validation.ok}
        >
          {t("Aplicar a mi tienda", "Apply to my store")}
        </button>
        {message && (
          <p className={s.success} role="status">
            {message}
          </p>
        )}
        {error && <p className={s.error}>{error}</p>}
      </aside>
    </div>
  );
}
