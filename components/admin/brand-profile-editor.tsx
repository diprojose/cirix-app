"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { BrandProfile } from "@/modules/loyalty/branding/application/brand-profile";
import { supportsSharedReadableText } from "@/modules/loyalty/branding/application/color-contrast";
import { themeVariables } from "@/modules/loyalty/branding/ui/brand-theme";
import { saveBrandProfileAction } from "@/app/admin/actions";
import { LocalizedLink } from "@/components/localized-link";
import { useLocale } from "@/components/locale-provider";
import { localizeHref } from "@/lib/locale";

const FIELD =
  "h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill";

const EMPTY_PROFILE: BrandProfile = {
  id: "",
  slug: "",
  displayName: "",
  tagline: "Tu mercado de todos los días",
  logoUrl: "",
  primaryColor: "#164e3d",
  secondaryColor: "#d8f35f",
  accentColor: "#ff6636",
  backgroundColor: "#f6f7f2",
  surfaceColor: "#ffffff",
  heroTitle: "Fresco, fácil y con recompensas.",
  heroSubtitle: "Compra tus favoritos y gana beneficios en cada pedido.",
  active: true,
  updatedAt: "",
};

export function BrandProfileEditor({
  profiles,
  initialProfileId,
}: {
  profiles: BrandProfile[];
  initialProfileId?: string;
}) {
  const [draft, setDraft] = useState<BrandProfile>(
    profiles.find((profile) => profile.id === initialProfileId) ??
      profiles[0] ??
      EMPTY_PROFILE
  );
  const [logoPreview, setLogoPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const locale = useLocale();

  const previewProfile = useMemo(
    () => ({
      ...draft,
      displayName: draft.displayName || "Nombre del cliente",
      heroTitle: draft.heroTitle || "Tu compra ahora te recompensa.",
      logoUrl: logoPreview || draft.logoUrl,
    }),
    [draft, logoPreview]
  );
  const surfacesAreCompatible = supportsSharedReadableText([
    draft.backgroundColor,
    draft.surfaceColor,
  ]);

  useEffect(
    () => () => {
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview]
  );

  function update<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectProfile(id: string) {
    setLogoPreview("");
    setCopied(false);
    if (id === "__new") {
      setDraft({ ...EMPTY_PROFILE });
      return;
    }
    const profile = profiles.find((item) => item.id === id);
    if (profile) setDraft(profile);
  }

  function duplicateProfile() {
    setLogoPreview("");
    setCopied(false);
    setDraft((current) => ({
      ...current,
      id: "",
      slug: current.slug ? `${current.slug}-copia` : "",
      displayName: current.displayName ? `${current.displayName} copia` : "",
      updatedAt: "",
    }));
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-strong">
            White-label
          </p>
          <h2 className="mt-1 text-lg font-bold text-text">Marca del demo</h2>
          <p className="mt-1 max-w-2xl text-xs text-text-muted">
            Carga la identidad del cliente y comparte una tienda interactiva con su propia URL.
          </p>
        </div>
        <div className="flex gap-2">
          {draft.id && (
            <>
              <button
                type="button"
                onClick={async () => {
                  const path = localizeHref(locale, `/demo/${draft.slug}/home`);
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-text hover:bg-stone-100"
              >
                {copied ? "Copiado ✓" : "Copiar enlace"}
              </button>
              <LocalizedLink
                href={`/demo/${draft.slug}/home`}
                target="_blank"
                className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-text hover:bg-stone-100"
              >
                Abrir demo ↗
              </LocalizedLink>
            </>
          )}
          <button
            type="button"
            onClick={duplicateProfile}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-text hover:bg-stone-100"
          >
            Duplicar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
        <form action={saveBrandProfileAction} className="space-y-5 p-4 md:p-6">
          <input type="hidden" name="id" value={draft.id} />

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Cliente</span>
            <select
              value={draft.id || "__new"}
              onChange={(event) => selectProfile(event.target.value)}
              className={FIELD}
            >
              <option value="__new">+ Crear una marca</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Nombre comercial"
              name="displayName"
              value={draft.displayName}
              onChange={(value) => update("displayName", value)}
              placeholder="Mercado Fresco"
              required
            />
            <TextField
              label="Identificador de URL (fijo al guardar)"
              name="slug"
              value={draft.slug}
              onChange={(value) => update("slug", value.toLowerCase())}
              placeholder="mercado-fresco"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              readOnly={Boolean(draft.id)}
              required
            />
          </div>

          <TextField
            label="Frase corta"
            name="tagline"
            value={draft.tagline}
            onChange={(value) => update("tagline", value)}
            placeholder="Tu mercado de todos los días"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Subir logo</span>
              <input
                type="file"
                name="logoFile"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setLogoPreview(file ? URL.createObjectURL(file) : "");
                }}
                className="block h-12 w-full cursor-pointer rounded-xl border border-border bg-bg text-xs text-text file:mr-3 file:h-full file:border-0 file:bg-stone-100 file:px-3 file:text-xs file:font-semibold file:text-text"
              />
              <span className="block text-[0.68rem] text-text-muted">PNG, JPEG o WebP · máximo 750 KB.</span>
            </label>
            <TextField
              label="URL de logo (opcional)"
              name="logoUrl"
              value={draft.logoUrl}
              onChange={(value) => update("logoUrl", value)}
              placeholder="https://…/logo.png"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-text">Paleta</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <ColorField label="Principal" name="primaryColor" value={draft.primaryColor} onChange={(value) => update("primaryColor", value)} />
              <ColorField label="Secundario" name="secondaryColor" value={draft.secondaryColor} onChange={(value) => update("secondaryColor", value)} />
              <ColorField label="Acción" name="accentColor" value={draft.accentColor} onChange={(value) => update("accentColor", value)} />
              <ColorField label="Fondo" name="backgroundColor" value={draft.backgroundColor} onChange={(value) => update("backgroundColor", value)} />
              <ColorField label="Superficie" name="surfaceColor" value={draft.surfaceColor} onChange={(value) => update("surfaceColor", value)} />
            </div>
            <p
              role="status"
              className={`mt-2 text-xs ${
                surfacesAreCompatible ? "text-text-muted" : "font-semibold text-danger"
              }`}
            >
              {surfacesAreCompatible
                ? "El texto se ajustará automáticamente para mantener contraste AA."
                : "Fondo y superficie deben ser ambos claros o ambos oscuros."}
            </p>
          </fieldset>

          <TextField
            label="Título principal"
            name="heroTitle"
            value={draft.heroTitle}
            onChange={(value) => update("heroTitle", value)}
            required
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Texto principal</span>
            <textarea
              name="heroSubtitle"
              value={draft.heroSubtitle}
              maxLength={180}
              rows={3}
              onChange={(event) => update("heroSubtitle", event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-action-fill"
            />
          </label>

          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-text">
            <input
              type="checkbox"
              name="active"
              checked={draft.active}
              onChange={(event) => update("active", event.target.checked)}
              className="h-5 w-5 accent-action-fill"
            />
            Demo activo y accesible por enlace
          </label>

          <button
            type="submit"
            disabled={!surfacesAreCompatible}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-action-fill px-5 text-sm font-bold text-on-action shadow-action transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar marca
          </button>
        </form>

        <BrandPreview profile={previewProfile} />
      </div>
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  pattern,
  readOnly = false,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  pattern?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        pattern={pattern}
        readOnly={readOnly}
        required={required}
        className={`${FIELD} read-only:cursor-not-allowed read-only:bg-stone-100`}
      />
    </label>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-xl border border-border bg-bg p-2">
      <span className="block text-[0.65rem] font-semibold text-text-muted">{label}</span>
      <span className="mt-2 flex items-center gap-2">
        <input
          type="color"
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />
        <span className="truncate font-mono text-[0.65rem] uppercase text-text">{value}</span>
      </span>
    </label>
  );
}

function BrandPreview({ profile }: { profile: BrandProfile }) {
  return (
    <div className="border-t border-border bg-brand-950 p-4 lg:border-l lg:border-t-0 md:p-6">
      <div className="sticky top-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-white/60">Vista previa</p>
        <div
          style={themeVariables(profile)}
          className="mx-auto aspect-[9/15] max-h-[42rem] overflow-hidden rounded-[2rem] bg-bg text-text shadow-float"
        >
          <div className="flex items-center justify-between bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="block h-8 w-8 rounded-lg bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundColor: profile.logoUrl ? "#fff" : profile.primaryColor,
                  backgroundImage: profile.logoUrl ? `url(${profile.logoUrl})` : undefined,
                }}
              />
              <strong className="max-w-32 truncate text-xs">{profile.displayName}</strong>
            </div>
            <span className="rounded-full bg-accent-soft px-2 py-1 text-[0.55rem] font-bold text-accent">$12.50</span>
          </div>
          <div className="p-3">
            <div className="h-9 rounded-xl border border-border bg-surface px-3 py-2 text-[0.6rem] text-text-muted">Buscar productos…</div>
            <div className="relative mt-3 h-44 overflow-hidden rounded-2xl bg-accent-fill p-4 text-on-accent">
              <p className="max-w-[11rem] font-heading text-xl font-extrabold leading-[0.95]">{profile.heroTitle}</p>
              <p className="mt-2 max-w-[10rem] text-[0.52rem]">{profile.heroSubtitle}</p>
              <span className="mt-3 inline-flex rounded-lg bg-action-fill px-3 py-1.5 text-[0.55rem] font-bold text-on-action">Comprar ahora</span>
              <Image src="/products/aguacate.png" alt="" width={105} height={105} className="absolute -bottom-2 -right-2 rotate-[-8deg] object-contain drop-shadow-xl" />
            </div>
            <p className="mb-2 mt-4 text-[0.65rem] font-bold">Lo mejor para ti</p>
            <div className="grid grid-cols-3 gap-2">
              {["tomates.png", "brocoli.png", "zanahorias.png"].map((image) => (
                <div key={image} className="rounded-xl border border-border bg-surface p-1.5">
                  <div className="relative aspect-square rounded-lg bg-accent-subtle">
                    <Image src={`/products/${image}`} alt="" fill sizes="80px" className="object-contain p-1" />
                  </div>
                  <div className="mt-1 h-1.5 w-4/5 rounded bg-stone-200" />
                  <div className="mt-1 h-1.5 w-1/2 rounded bg-accent-soft" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto grid grid-cols-4 border-t border-border bg-surface px-3 py-2 text-center text-[0.5rem] text-text-muted">
            <span className="font-bold text-accent">Inicio</span><span>Shop</span><span>Carrito</span><span>Cuenta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
