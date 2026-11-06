import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RewardCatalogForm } from "@/components/receipts/reward-catalog-form";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetCustomer } from "@/modules/crm/infrastructure/di/crm-core-container";
import { makeListRecentRedemptions, makeListRewards } from "@/modules/receipts/infrastructure/di/receipts-container";
import type { RedemptionDto } from "@/modules/receipts/application/dtos/reward-dtos";

export const metadata: Metadata = {
  title: "Rewards",
  robots: { index: false, follow: false },
};

const RECENT = 30;

/** The owner's prize catalog, and the prizes customers redeemed lately. Supermarkets only. */
export default async function RewardsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { access } = await requireBusinessAccess(slug, "program:manage");
  const { business } = access;
  if (business.kind !== "supermarket") notFound();

  const [rewards, recent] = await Promise.all([
    makeListRewards().execute({ businessId: business.id, activeOnly: false }),
    makeListRecentRedemptions().execute({ businessId: business.id, limit: RECENT }),
  ]);
  if (!rewards.ok || !recent.ok) notFound();

  const getCustomer = makeGetCustomer();
  const userIds = [...new Set(recent.value.map((redemption) => redemption.userId))];
  const customers = await Promise.all(userIds.map((userId) => getCustomer.execute({ businessId: business.id, userId })));
  const names = new Map(customers.flatMap((customer, index) => (customer.ok ? [[userIds[index], customer.value.name] as const] : [])));

  const number = new Intl.NumberFormat(locale);
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const statusLabel = (status: RedemptionDto["status"]): string =>
    status === "delivered"
      ? pick(locale, { es: "Entregado", en: "Delivered" })
      : status === "cancelled"
        ? pick(locale, { es: "Cancelado", en: "Cancelled" })
        : status === "expired"
          ? pick(locale, { es: "Vencido", en: "Expired" })
          : pick(locale, { es: "Por recoger", en: "To pick up" });

  return (
    <main className="flex flex-col gap-8">
      <section className="flex flex-col gap-5 md:max-w-md">
        <header className="flex flex-col gap-1">
          <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Premios", en: "Rewards" })}</h1>
          <p className="text-label text-text-muted">
            {pick(locale, {
              es: "El cliente elige un premio y recibe un código. Tu personal lo escanea en caja y confirma la entrega. Si cambias un precio, los códigos ya creados conservan el suyo.",
              en: "Customers choose a reward and get a code. Your staff scan it at the counter and confirm the handover. If you change a price, codes already created keep theirs.",
            })}
          </p>
        </header>
        <RewardCatalogForm slug={business.slug} rewards={rewards.value} />
      </section>

      <section aria-labelledby="recent-redemptions" className="flex flex-col gap-3">
        <h2 id="recent-redemptions" className="text-body font-medium text-text">{pick(locale, { es: "Últimos canjes", en: "Latest redemptions" })}</h2>
        {recent.value.length === 0 ? (
          <p className="text-label text-text-muted">{pick(locale, { es: "Todavía no hay canjes.", en: "No redemptions yet." })}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[36rem] border-collapse text-left text-label">
              <thead className="bg-surface text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Cliente", en: "Customer" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Premio", en: "Reward" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Puntos", en: "Points" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Estado", en: "Status" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Creado", en: "Created" })}</th>
                </tr>
              </thead>
              <tbody>
                {recent.value.map((redemption) => (
                  <tr key={redemption.code} className="border-t border-border text-text">
                    <td className="px-4 py-2">{names.get(redemption.userId) ?? "—"}</td>
                    <td className="px-4 py-2">{redemption.rewardName}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{number.format(redemption.points)}</td>
                    <td className="whitespace-nowrap px-4 py-2">{statusLabel(redemption.status)}</td>
                    <td className="whitespace-nowrap px-4 py-2">{when.format(new Date(redemption.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
