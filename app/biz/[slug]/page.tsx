import type { Metadata } from "next";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER_READ } from "@/components/store/layout";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { roleCan } from "@/core/tenancy/domain/value-objects/member-role";
import { makeListCustomers } from "@/modules/crm/infrastructure/di/crm-core-container";

export const metadata: Metadata = {
  title: "Business",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

const ACTION =
  "flex min-h-11 items-center justify-center rounded-pill px-5 py-2 text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/** The business dashboard. For now: who joined, newest first. */
export default async function BusinessDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  // The layout already proved membership; this proves the role may see customers.
  const { access } = await requireBusinessAccess(slug);
  const canReadCustomers = roleCan(access.role, "customers:read");

  const customers = canReadCustomers
    ? await makeListCustomers().execute({ businessId: access.business.id, limit: PAGE_SIZE })
    : null;
  const rows = customers?.ok ? customers.value.customers : [];
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <main className={`${CONTAINER_READ} flex min-h-dvh flex-1 flex-col gap-6 py-10`}>
      <header className="flex flex-col gap-1">
        <LocalizedLink href="/me" className="text-label text-accent underline underline-offset-4">
          {pick(locale, { es: "← Mi cuenta", en: "← My account" })}
        </LocalizedLink>
        <h1 className="text-display font-bold tracking-tight text-text">{access.business.name}</h1>
        <p className="text-label text-text-muted">
          {access.role === "owner"
            ? pick(locale, { es: "Propietario", en: "Owner" })
            : access.role === "staff"
              ? pick(locale, { es: "Personal", en: "Staff" })
              : pick(locale, { es: "Administrador de Cirix", en: "Cirix administrator" })}
        </p>
      </header>

      {access.business.kind !== "supermarket" && (
        <nav
          aria-label={pick(locale, { es: "Acciones del negocio", en: "Business actions" })}
          className="flex flex-wrap gap-2"
        >
          {roleCan(access.role, "visits:record") && (
            <LocalizedLink href={`/biz/${access.business.slug}/scan`} className={`${ACTION} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}>
              {pick(locale, { es: "Escanear cliente", en: "Scan customer" })}
            </LocalizedLink>
          )}
          {roleCan(access.role, "program:manage") && (
            <LocalizedLink href={`/biz/${access.business.slug}/program`} className={`${ACTION} border border-border bg-surface text-text hover:bg-stone-100`}>
              {pick(locale, { es: "Programa de sellos", en: "Stamp program" })}
            </LocalizedLink>
          )}
          {roleCan(access.role, "program:manage") && (
            <LocalizedLink href={`/biz/${access.business.slug}/qr`} className={`${ACTION} border border-border bg-surface text-text hover:bg-stone-100`}>
              {pick(locale, { es: "QR de mesa", en: "Table QR" })}
            </LocalizedLink>
          )}
        </nav>
      )}

      {!canReadCustomers ? (
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "Tu rol valida visitas de clientes: escanea su código QR para sellar su tarjeta.",
            en: "Your role validates customer visits: scan their QR code to stamp their card.",
          })}
        </p>
      ) : (
        <section aria-labelledby="customers-title" className="flex flex-col gap-3">
          <h2 id="customers-title" className="text-body font-medium text-text">
            {pick(locale, { es: "Clientes", en: "Customers" })}
          </h2>
          {rows.length === 0 ? (
            <p className="text-label text-text-muted">
              {pick(locale, {
                es: "Todavía no hay clientes. Comparte el código QR de tu negocio para que se registren.",
                en: "No customers yet. Share your business QR code so people can sign up.",
              })}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[32rem] border-collapse text-left text-label">
                <thead className="bg-surface text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Nombre", en: "Name" })}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Correo", en: "Email" })}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Teléfono", en: "Phone" })}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Desde", en: "Since" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((customer) => (
                    <tr key={customer.userId} className="border-t border-border text-text">
                      <td className="px-4 py-2">{customer.name}</td>
                      <td className="break-all px-4 py-2">{customer.email}</td>
                      <td className="px-4 py-2">{customer.phone ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2">{date.format(new Date(customer.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {customers?.ok && customers.value.nextCursor !== null && (
            <p className="text-caption text-text-muted">
              {pick(locale, {
                es: `Mostrando los ${PAGE_SIZE} más recientes.`,
                en: `Showing the ${PAGE_SIZE} most recent.`,
              })}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
