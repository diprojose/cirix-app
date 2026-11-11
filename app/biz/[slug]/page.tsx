import type { Metadata } from "next";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { roleCan } from "@/core/tenancy/domain/value-objects/member-role";
import { makeListCustomers } from "@/modules/crm/infrastructure/di/crm-core-container";
import { makeListCardProgress } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";
import { makeListPointsBalances } from "@/modules/receipts/infrastructure/di/receipts-container";

export const metadata: Metadata = {
  title: "Business",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

/** The business home: who joined, newest first, with their card progress. The menu lives in the layout. */
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
  const showsStamps = access.business.kind !== "supermarket";
  const progress =
    showsStamps && rows.length > 0
      ? await makeListCardProgress().execute({ businessId: access.business.id, userIds: rows.map((row) => row.userId) })
      : null;
  const cards = progress?.ok ? progress.value : {};
  const balances =
    !showsStamps && rows.length > 0
      ? await makeListPointsBalances().execute({ businessId: access.business.id, userIds: rows.map((row) => row.userId) })
      : null;
  const points = balances?.ok ? balances.value : {};
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <main className="flex flex-col gap-6">
      {!canReadCustomers ? (
        <p className="text-body text-text-muted">
          {showsStamps
            ? pick(locale, {
                es: "Tu rol valida visitas de clientes: escanea su código QR para registrar su visita.",
                en: "Your role validates customer visits: scan their QR code to record their visit.",
              })
            : pick(locale, {
                es: "Tu rol entrega premios: en Escanear, lee el código de premio del cliente y confirma la entrega.",
                en: "Your role hands over rewards: in Scan, read the customer's reward code and confirm the handover.",
              })}
        </p>
      ) : (
        <section aria-labelledby="customers-title" className="flex flex-col gap-3">
          <h1 id="customers-title" className="text-display font-bold tracking-tight text-text">
            {pick(locale, { es: "Clientes", en: "Customers" })}
          </h1>
          {rows.length === 0 ? (
            <p className="text-label text-text-muted">
              {pick(locale, {
                es: "Todavía no hay clientes. Comparte el código QR de tu negocio para que se registren.",
                en: "No customers yet. Share your business QR code so people can sign up.",
              })}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[36rem] border-collapse text-left text-label">
                <thead className="bg-surface text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Cliente", en: "Customer" })}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Teléfono", en: "Phone" })}</th>
                    {showsStamps && (
                      <>
                        <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Visitas", en: "Visits" })}</th>
                        <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Última visita", en: "Last visit" })}</th>
                      </>
                    )}
                    {!showsStamps && (
                      <>
                        <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Puntos", en: "Points" })}</th>
                        <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Último recibo", en: "Last receipt" })}</th>
                      </>
                    )}
                    <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Desde", en: "Since" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((customer) => {
                    const card = cards[customer.userId];
                    return (
                      <tr key={customer.userId} className="border-t border-border text-text">
                        <td className="px-4 py-2">
                          {customer.name}
                          <span className="block break-all text-caption text-text-muted">{customer.email}</span>
                        </td>
                        <td className="px-4 py-2">{customer.phone ?? "—"}</td>
                        {showsStamps && (
                          <>
                            <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                              {!card ? (
                                "—"
                              ) : card.rewardReady ? (
                                <span className="rounded-pill bg-accent-soft px-2 py-0.5 font-medium text-accent-strong">
                                  {pick(locale, { es: "Premio listo", en: "Reward ready" })}
                                </span>
                              ) : (
                                `${card.stamps}/${card.required}`
                              )}
                              {card && card.redeemedCount > 0 && (
                                <span className="block text-caption text-text-muted">
                                  {pick(locale, {
                                    es: `${card.redeemedCount} ${card.redeemedCount === 1 ? "premio canjeado" : "premios canjeados"}`,
                                    en: `${card.redeemedCount} ${card.redeemedCount === 1 ? "reward redeemed" : "rewards redeemed"}`,
                                  })}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2">
                              {card?.lastStampAt ? date.format(new Date(card.lastStampAt)) : "—"}
                            </td>
                          </>
                        )}
                        {!showsStamps && (
                          <>
                            <td className="whitespace-nowrap px-4 py-2 tabular-nums">{points[customer.userId]?.balance ?? 0}</td>
                            <td className="whitespace-nowrap px-4 py-2">
                              {points[customer.userId]?.lastEarnedAt ? date.format(new Date(points[customer.userId].lastEarnedAt as string)) : "—"}
                            </td>
                          </>
                        )}
                        <td className="whitespace-nowrap px-4 py-2">{date.format(new Date(customer.createdAt))}</td>
                      </tr>
                    );
                  })}
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
