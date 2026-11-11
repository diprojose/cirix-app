import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocalizedLink } from "@/components/localized-link";
import { COLUMN } from "@/components/store/layout";
import { getMemberViewer } from "@/lib/auth/dal";
import { MEMBER_LOGIN_PATH } from "@/lib/auth/route-access";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";
import {
  makeListBusinessesByIds,
  makeListMyBusinesses,
} from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeListMyCustomerBusinesses } from "@/modules/crm/infrastructure/di/crm-core-container";
import type { BusinessDto } from "@/core/tenancy/application/dtos/business-dto";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

const SIGN_OUT_BUTTON =
  "min-h-11 shrink-0 rounded-pill border border-border bg-surface px-4 py-2 text-label font-medium text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";
const CARD = "flex min-h-11 flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3";
const LINK_CARD = `${CARD} transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`;

/** A signed-in person's own area: the programs they joined and the businesses they run. */
export default async function MePage() {
  const [viewer, locale] = await Promise.all([getMemberViewer(), getCurrentLocale()]);
  if (!viewer.authenticated || viewer.uid === null) {
    redirect(await localizeForCurrentRequest("/login?from=/me"));
  }

  // Everything below is scoped to the session's own user id.
  const [cardIds, roles] = await Promise.all([
    makeListMyCustomerBusinesses().execute(viewer.uid),
    makeListMyBusinesses().execute(viewer.uid),
  ]);
  const cardBusinesses: BusinessDto[] = cardIds.ok
    ? await makeListBusinessesByIds().execute(cardIds.value).then((result) => (result.ok ? result.value : []))
    : [];
  const managed = roles.ok ? roles.value : [];

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-8 py-10 md:max-w-md`}>
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-display font-bold tracking-tight text-text">
            {pick(locale, { es: "Mi cuenta", en: "My account" })}
          </h1>
          <SignOutButton redirectTo={MEMBER_LOGIN_PATH} className={SIGN_OUT_BUTTON} />
        </div>
        <p className="break-all text-body text-text-muted">{viewer.email}</p>
      </header>

      <section aria-labelledby="my-cards" className="flex flex-col gap-3">
        <h2 id="my-cards" className="text-body font-medium text-text">
          {pick(locale, { es: "Mis programas", en: "My programs" })}
        </h2>
        {cardBusinesses.length === 0 ? (
          <p className="text-label text-text-muted">
            {pick(locale, {
              es: "Aún no estás en ningún programa. Escanea el QR de un negocio para unirte.",
              en: "You haven't joined any program yet. Scan a business QR code to join.",
            })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cardBusinesses.map((business) => (
              <li key={business.id}>
                {business.kind === "supermarket" ? (
                  <LocalizedLink href={`/me/points/${business.slug}`} className={LINK_CARD}>
                    <span className="text-body font-medium text-text">{business.name}</span>
                    <span className="text-caption text-text-muted">
                      {pick(locale, { es: "Ver mis puntos", en: "View my points" })}
                    </span>
                  </LocalizedLink>
                ) : (
                  <LocalizedLink href={`/me/cards/${business.slug}`} className={LINK_CARD}>
                    <span className="text-body font-medium text-text">{business.name}</span>
                    <span className="text-caption text-text-muted">
                      {pick(locale, { es: "Ver mis visitas", en: "View my visits" })}
                    </span>
                  </LocalizedLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {managed.length > 0 && (
        <section aria-labelledby="my-businesses" className="flex flex-col gap-3">
          <h2 id="my-businesses" className="text-body font-medium text-text">
            {pick(locale, { es: "Mis negocios", en: "My businesses" })}
          </h2>
          <ul className="flex flex-col gap-2">
            {managed.map(({ business, role }) => (
              <li key={business.id}>
                <LocalizedLink href={`/biz/${business.slug}`} className={LINK_CARD}>
                  <span className="text-body font-medium text-text">{business.name}</span>
                  <span className="text-caption text-text-muted">
                    {role === "owner"
                      ? pick(locale, { es: "Propietario", en: "Owner" })
                      : pick(locale, { es: "Personal", en: "Staff" })}
                  </span>
                </LocalizedLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col items-center gap-3">
        <LocalizedLink href="/privacy" className="text-caption text-text-muted underline underline-offset-4">
          {pick(locale, { es: "Política de privacidad", en: "Privacy policy" })}
        </LocalizedLink>
      </div>
    </main>
  );
}
