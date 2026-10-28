import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { JoinForm } from "@/components/member/join-form";
import { LocalizedLink } from "@/components/localized-link";
import { COLUMN } from "@/components/store/layout";
import { getMemberViewer } from "@/lib/auth/dal";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";
import { cardPath, readTableCodeParam } from "@/lib/stamps/table-qr";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeListMyCustomerBusinesses } from "@/modules/crm/infrastructure/di/crm-core-container";

// A signup page is for people holding the QR code, not for search engines.
export const metadata: Metadata = {
  title: "Join",
  robots: { index: false, follow: false },
};

/**
 * The page a business QR code opens: sign up as a customer of that business. The
 * table QR also carries the table code (`t`), which travels on to the card so a
 * restaurant customer can stamp the visit right after joining.
 */
export default async function JoinBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string | string[]; t?: string | string[] }>;
}) {
  const [{ slug }, { source, t }, locale, viewer] = await Promise.all([
    params,
    searchParams,
    getCurrentLocale(),
    getMemberViewer(),
  ]);

  const business = await makeGetBusinessBySlug().execute(slug);
  // Unknown and suspended businesses look the same: there is nothing to join.
  if (!business.ok) notFound();

  const joined =
    viewer.authenticated && viewer.uid !== null
      ? await makeListMyCustomerBusinesses().execute(viewer.uid)
      : null;
  const alreadyMember = joined?.ok === true && joined.value.includes(business.value.id);
  const hasCard = business.value.kind !== "supermarket";
  // Restaurants land on their stamp card after joining; others on the account page.
  const nextPath = hasCard ? cardPath(business.value.slug, readTableCodeParam(t)) : "/me";
  // A returning customer who scans the table goes straight to the card.
  if (alreadyMember && hasCard) redirect(await localizeForCurrentRequest(nextPath));
  // Only the QR flow is distinguished; anything else counts as a plain web signup.
  const signupSource = (Array.isArray(source) ? source[0] : source) === "table_qr" ? "table_qr" : "web";

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col justify-center gap-8 py-10 md:max-w-md`}>
      <header className="flex flex-col items-center gap-3 text-center">
        <Image src="/brand/logo-white.svg" alt="CIRIX" width={160} height={57} className="mb-5 h-auto w-40" />
        <h1 className="text-display font-bold tracking-tight text-text">{business.value.name}</h1>
        <p className="max-w-sm text-body text-text-muted">
          {alreadyMember
            ? pick(locale, {
                es: "Ya eres parte de este programa. Tu tarjeta está en tu cuenta.",
                en: "You're already part of this program. Your card is in your account.",
              })
            : pick(locale, {
                es: "Regístrate en unos segundos para empezar a acumular beneficios.",
                en: "Sign up in a few seconds to start earning rewards.",
              })}
        </p>
      </header>

      {alreadyMember ? (
        <LocalizedLink
          href={nextPath}
          className="flex min-h-11 w-full items-center justify-center rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {pick(locale, { es: "Ver mi tarjeta", en: "View my card" })}
        </LocalizedLink>
      ) : (
        <JoinForm slug={business.value.slug} source={signupSource} next={nextPath} />
      )}
    </main>
  );
}
