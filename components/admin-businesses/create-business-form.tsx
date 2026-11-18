"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import { suggestSlug } from "@/core/tenancy/domain/value-objects/business-slug";

const INPUT =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60";
const LABEL = "text-label font-medium text-text";
const HELP = "text-caption text-text-muted";

type Kind = "restaurant" | "supermarket";

/** Why the server refused, in words the administrator can act on. */
function errorText(locale: Locale, code: string | undefined, message: string | undefined): string {
  switch (code) {
    case "tenancy/slug-taken":
      return pick(locale, { es: "Esa dirección ya la usa otro negocio. Elige otra.", en: "Another business already uses that address. Choose another one." });
    case "tenancy/invalid-membership":
      return pick(locale, { es: "Revisa el correo del dueño.", en: "Check the owner's email." });
    case "tenancy/account-disabled":
      return pick(locale, {
        es: "La cuenta de ese correo está desactivada. Usa otro correo o reactívala primero.",
        en: "That email's account is disabled. Use another email or enable it first.",
      });
    case "tenancy/invalid-business":
      if (message?.startsWith("Name")) return pick(locale, { es: "El nombre debe tener entre 2 y 100 caracteres.", en: "The name must be 2 to 100 characters." });
      if (message?.includes("reserved")) return pick(locale, { es: "Esa dirección está reservada por la plataforma. Elige otra.", en: "That address is reserved by the platform. Choose another one." });
      return pick(locale, {
        es: "La dirección debe tener de 3 a 40 caracteres: letras minúsculas sin tilde, números y guiones.",
        en: "The address must be 3 to 40 characters: lowercase letters, digits and hyphens.",
      });
    default:
      return pick(locale, { es: "No se pudo crear el negocio. Intenta de nuevo.", en: "Could not create the business. Please try again." });
  }
}

/**
 * The form to open a business. The address follows the name until the
 * administrator edits it by hand; the server validates everything again.
 */
export function CreateBusinessForm() {
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [kind, setKind] = useState<Kind>("restaurant");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(suggestSlug(value));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase(), kind, ownerEmail: ownerEmail.trim().toLowerCase() }),
      });
      const payload = (await response.json().catch(() => null)) as { business?: { slug: string }; error?: { code?: string; message?: string } } | null;
      if (response.ok && payload?.business) {
        router.push(localizeHref(locale, `/businesses/${payload.business.slug}?created=1`));
        router.refresh();
        return;
      }
      setError(errorText(locale, payload?.error?.code, payload?.error?.message));
    } catch {
      setError(pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }));
    }
    setBusy(false);
  }

  const kinds: { value: Kind; title: string; hint: string }[] = [
    {
      value: "restaurant",
      title: pick(locale, { es: "Restaurante", en: "Restaurant" }),
      hint: pick(locale, { es: "Tarjeta de visitas con premio al completarla.", en: "Visit card with a reward when it is complete." }),
    },
    {
      value: "supermarket",
      title: pick(locale, { es: "Supermercado", en: "Supermarket" }),
      hint: pick(locale, { es: "Puntos por compra y catálogo de premios.", en: "Points per purchase and a reward catalog." }),
    },
  ];

  return (
    <form onSubmit={submit} aria-busy={busy} className="flex max-w-xl flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="business-name" className={LABEL}>{pick(locale, { es: "Nombre del negocio", en: "Business name" })}</label>
        <input id="business-name" required minLength={2} maxLength={100} autoComplete="off" value={name}
          onChange={(event) => changeName(event.target.value)} disabled={busy} className={INPUT} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="business-slug" className={LABEL}>{pick(locale, { es: "Dirección para el QR", en: "QR address" })}</label>
        <div className="flex items-stretch overflow-hidden rounded-xl border border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent">
          <span className="flex items-center bg-stone-100 px-3 text-label text-text-muted">/b/</span>
          <input id="business-slug" required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoComplete="off" spellCheck={false}
            value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); }} disabled={busy}
            aria-describedby="business-slug-help" className="min-h-11 w-full min-w-0 bg-surface px-3 py-3 text-body text-text outline-none disabled:opacity-60" />
        </div>
        <p id="business-slug-help" className={HELP}>
          {pick(locale, {
            es: "Es la dirección que abre el QR del negocio. Letras minúsculas sin tilde, números y guiones. No se puede cambiar después.",
            en: "The address the business QR code opens. Lowercase letters, digits and hyphens. It cannot be changed later.",
          })}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL} mb-2`}>{pick(locale, { es: "Tipo de negocio", en: "Business type" })}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {kinds.map((option) => (
            <label key={option.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                kind === option.value ? "border-accent bg-accent-subtle" : "border-border hover:bg-stone-50"
              }`}>
              <span className="flex items-center gap-2 text-body font-medium text-text">
                <input type="radio" name="business-kind" value={option.value} checked={kind === option.value}
                  onChange={() => setKind(option.value)} disabled={busy} className="size-4 accent-[var(--color-accent-fill)]" />
                {option.title}
              </span>
              <span className={HELP}>{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="owner-email" className={LABEL}>{pick(locale, { es: "Correo del dueño", en: "Owner's email" })}</label>
        <input id="owner-email" type="email" required maxLength={254} autoComplete="off" value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)} disabled={busy} aria-describedby="owner-email-help" className={INPUT} />
        <p id="owner-email-help" className={HELP}>
          {pick(locale, {
            es: "El correo con el que va a entrar: su cuenta de Google o uno donde reciba el enlace. No necesita tener cuenta todavía.",
            en: "The email they will sign in with: their Google account, or one where they get the link. They don't need an account yet.",
          })}
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-label font-medium text-danger">{error}</p>}

      <button type="submit" disabled={busy}
        className="min-h-12 w-full rounded-pill bg-accent-fill px-5 py-3 text-body font-semibold text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 sm:w-auto sm:self-start">
        {busy ? pick(locale, { es: "Creando…", en: "Creating…" }) : pick(locale, { es: "Crear negocio", en: "Create business" })}
      </button>
    </form>
  );
}
