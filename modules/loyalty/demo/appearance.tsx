"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  validateBrandProfile,
  type BrandProfile,
} from "../branding/application/brand-profile";
import {
  DEFAULT_BRAND_PROFILE,
  CIRIX_MARKET_PROFILE,
} from "../branding/infrastructure/brand-profile-seed";
import { themeVariables } from "../branding/ui/brand-theme";
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
const presets = [
  { name: "Mercado", profile: DEFAULT_BRAND_PROFILE },
  { name: "Cirix", profile: CIRIX_MARKET_PROFILE },
  {
    name: "Oliva",
    profile: {
      ...DEFAULT_BRAND_PROFILE,
      primaryColor: "#4b5131",
      secondaryColor: "#e8dcb8",
      accentColor: "#b95336",
      backgroundColor: "#f8f5ed",
      surfaceColor: "#ffffff",
    },
  },
];
export function Appearance() {
  const { state, dispatch, t } = useDemo();
  const [draft, setDraft] = useState<BrandProfile>(state.brand);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
      <form className={`${s.panel} ${s.form}`} onSubmit={save}>
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
          <div className={s.actions}>
            {presets.map((p) => (
              <button
                type="button"
                className={s.preset}
                key={p.name}
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    ...Object.fromEntries(
                      paletteFields.map(([key]) => [key, p.profile[key]]),
                    ),
                  }));
                  setMessage("");
                  setError("");
                }}
              >
                {[
                  p.profile.primaryColor,
                  p.profile.secondaryColor,
                  p.profile.accentColor,
                ].map((c) => (
                  <span
                    key={c}
                    className={s.swatch}
                    style={{ background: c }}
                  />
                ))}
                {p.name}
              </button>
            ))}
          </div>
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
          <h3>{preview.heroTitle}</h3>
          <p className={s.muted}>{preview.heroSubtitle}</p>
          <span className={s.primary}>
            {t("Comprar ahora", "Shop now")} →
          </span>{" "}
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
            "La vista previa muestra la última combinación válida. Los cambios se guardan solo en este navegador.",
            "The preview shows the latest valid combination. Changes are saved only in this browser.",
          )}
        </p>
      </aside>
    </div>
  );
}
