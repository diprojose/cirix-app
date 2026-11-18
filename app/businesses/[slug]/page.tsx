import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { AdminShell, DemoPill, KIND_LABEL, StatusPill } from "@/components/admin-businesses/admin-shell";
import { BusinessAdminActions } from "@/components/admin-businesses/business-admin-actions";
import { requireCirixAdmin } from "@/lib/auth/cirix-admin";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetBusinessForAdmin } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetReceiptSettings } from "@/modules/receipts/infrastructure/di/receipts-container";

export const metadata: Metadata = {
  title: "Business",
  robots: { index: false, follow: false },
};

const LINK_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-surface px-4 py-2 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const SECTION = "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5";

/** One business as Cirix sees it: its data, its team, and the switches only Cirix may flip. */
export default async function BusinessAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireCirixAdmin();
  const [{ slug }, { created }, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const found = await makeGetBusinessForAdmin().execute(slug);
  if (!found.ok) notFound();
  const business = found.value;
  const receipts = await makeGetReceiptSettings().execute(business.id);
  const demoMode = receipts.ok && receipts.value.demoMode;
  const storeNames = receipts.ok ? receipts.value.storeNames : [];
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const owners = business.team.filter((member) => member.role === "owner");

  return (
    <AdminShell locale={locale} back>
      {created === "1" && (
        <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-label font-medium text-accent-strong">
          {pick(locale, {
            es: `Listo, el negocio quedó creado. ${owners[0]?.email ?? "El dueño"} ya puede entrar con su correo y verá "${business.name}" en su cuenta.`,
            en: `Done, the business is created. ${owners[0]?.email ?? "The owner"} can now sign in with their email and will see "${business.name}" in their account.`,
          })}
        </p>
      )}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill locale={locale} status={business.status} />
          {demoMode && <DemoPill locale={locale} />}
        </div>
        <h1 className="text-display font-bold tracking-tight text-text">{business.name}</h1>
        <dl className="grid gap-x-8 gap-y-2 text-label sm:grid-cols-3">
          <div className="flex flex-col">
            <dt className="text-caption text-text-muted">{pick(locale, { es: "Tipo", en: "Type" })}</dt>
            <dd className="text-text">{pick(locale, KIND_LABEL[business.kind])}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-caption text-text-muted">{pick(locale, { es: "Dirección del QR", en: "QR address" })}</dt>
            <dd className="break-all text-text">/b/{business.slug}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-caption text-text-muted">{pick(locale, { es: "Creado", en: "Created" })}</dt>
            <dd className="text-text">{date.format(new Date(business.createdAt))}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <LocalizedLink href={`/biz/${business.slug}`} className={LINK_BUTTON}>
            {pick(locale, { es: "Abrir el panel del negocio", en: "Open the business panel" })}
          </LocalizedLink>
          {business.status === "active" && (
            <LocalizedLink href={`/b/${business.slug}`} className={LINK_BUTTON}>
              {pick(locale, { es: "Ver la página de registro", en: "View the signup page" })}
            </LocalizedLink>
          )}
        </div>
      </header>

      <section aria-labelledby="team" className={SECTION}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="team" className="text-title font-semibold text-text">{pick(locale, { es: "Dueños y personal", en: "Owners and staff" })}</h2>
            <p className="text-label text-text-muted">
              {pick(locale, {
                es: "Solo Cirix puede agregar o quitar dueños. El dueño agrega y quita a su personal.",
                en: "Only Cirix can add or remove owners. The owner adds and removes their staff.",
              })}
            </p>
          </div>
          <LocalizedLink href={`/biz/${business.slug}/team`} className={LINK_BUTTON}>
            {pick(locale, { es: "Cambiar dueños o personal", en: "Change owners or staff" })}
          </LocalizedLink>
        </div>
        {business.team.length === 0 ? (
          <p className="text-label text-danger">{pick(locale, { es: "Este negocio no tiene dueño. Agrega uno.", en: "This business has no owner. Add one." })}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {business.team.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="break-all text-body text-text">{member.email}</span>
                <span className="text-caption text-text-muted">
                  {member.role === "owner" ? pick(locale, { es: "Dueño", en: "Owner" }) : pick(locale, { es: "Personal", en: "Staff" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BusinessAdminActions
        slug={business.slug}
        businessName={business.name}
        status={business.status}
        demoMode={demoMode}
        storeNames={storeNames}
      />
    </AdminShell>
  );
}
