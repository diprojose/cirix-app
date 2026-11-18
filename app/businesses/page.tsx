import type { Metadata } from "next";
import { LocalizedLink } from "@/components/localized-link";
import { AdminShell, DemoPill, KIND_LABEL, StatusPill } from "@/components/admin-businesses/admin-shell";
import { requireCirixAdmin } from "@/lib/auth/cirix-admin";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeListAllBusinesses } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetReceiptSettings } from "@/modules/receipts/infrastructure/di/receipts-container";

export const metadata: Metadata = {
  title: "Businesses",
  robots: { index: false, follow: false },
};

const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-pill bg-accent-fill px-5 py-2 text-label font-semibold text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/** Every business Cirix runs a loyalty program for, with its owner and anything that needs attention. */
export default async function BusinessesPage() {
  await requireCirixAdmin();
  const locale = await getCurrentLocale();
  const listed = await makeListAllBusinesses().execute();
  const businesses = listed.ok ? listed.value : [];
  const demo = await Promise.all(
    businesses.map((business) => makeGetReceiptSettings().execute(business.id).then((result) => result.ok && result.value.demoMode))
  );
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <AdminShell locale={locale}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Negocios", en: "Businesses" })}</h1>
          <p className="text-label text-text-muted">
            {pick(locale, {
              es: `${businesses.length} ${businesses.length === 1 ? "negocio" : "negocios"} con programa de fidelización.`,
              en: `${businesses.length} ${businesses.length === 1 ? "business" : "businesses"} with a loyalty program.`,
            })}
          </p>
        </div>
        <LocalizedLink href="/businesses/new" className={PRIMARY}>
          {pick(locale, { es: "Crear negocio", en: "New business" })}
        </LocalizedLink>
      </header>

      {businesses.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface px-5 py-8">
          <p className="text-body font-medium text-text">{pick(locale, { es: "Todavía no hay negocios.", en: "No businesses yet." })}</p>
          <p className="text-label text-text-muted">
            {pick(locale, {
              es: "Crea el primero con su nombre, si es restaurante o supermercado, y el correo de su dueño.",
              en: "Create the first one with its name, whether it is a restaurant or a supermarket, and its owner's email.",
            })}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {businesses.map((business, index) => {
            const owners = business.team.filter((member) => member.role === "owner").map((member) => member.email);
            const staff = business.team.length - owners.length;
            return (
              <li key={business.id}>
                <LocalizedLink
                  href={`/businesses/${business.slug}`}
                  className="grid gap-x-6 gap-y-2 px-4 py-4 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center md:px-5"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-body font-semibold text-text">{business.name}</span>
                    <span className="text-caption text-text-muted">
                      {pick(locale, KIND_LABEL[business.kind])} · /b/{business.slug} · {pick(locale, { es: "desde", en: "since" })} {date.format(new Date(business.createdAt))}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 text-label">
                    <span className="truncate text-text">
                      {owners.length > 0 ? owners.join(", ") : pick(locale, { es: "Sin dueño", en: "No owner" })}
                    </span>
                    <span className="text-caption text-text-muted">
                      {pick(locale, {
                        es: staff === 1 ? "1 persona de personal" : `${staff} personas de personal`,
                        en: staff === 1 ? "1 staff member" : `${staff} staff members`,
                      })}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusPill locale={locale} status={business.status} />
                    {demo[index] && <DemoPill locale={locale} />}
                  </span>
                </LocalizedLink>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
