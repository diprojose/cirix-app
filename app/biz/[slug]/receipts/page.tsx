import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptSettingsForm } from "@/components/receipts/receipt-settings-form";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetCustomer } from "@/modules/crm/infrastructure/di/crm-core-container";
import { makeGetReceiptSettings, makeListRecentReceipts } from "@/modules/receipts/infrastructure/di/receipts-container";

export const metadata: Metadata = {
  title: "Receipts",
  robots: { index: false, follow: false },
};

const RECENT = 30;

/** The owner's rules for receipts, and the ones customers used lately so they can be reviewed. */
export default async function ReceiptsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  // Shows customer names, and only roles that manage the program reach it.
  const { access } = await requireBusinessAccess(slug, "program:manage");
  const { business } = access;

  const [settings, recent] = await Promise.all([
    makeGetReceiptSettings().execute(business.id),
    makeListRecentReceipts().execute({ businessId: business.id, limit: RECENT }),
  ]);
  if (!settings.ok || !recent.ok) notFound();

  const getCustomer = makeGetCustomer();
  const userIds = [...new Set(recent.value.map((receipt) => receipt.userId))];
  const customers = await Promise.all(userIds.map((userId) => getCustomer.execute({ businessId: business.id, userId })));
  const names = new Map(customers.flatMap((customer, index) => (customer.ok ? [[userIds[index], customer.value.name] as const] : [])));

  const earnsPoints = business.kind === "supermarket";
  // Written as on the receipt, whatever the language: $3.11.
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="flex flex-col gap-8">
      <section className="flex flex-col gap-5 md:max-w-md">
        <header className="flex flex-col gap-1">
          <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Recibos", en: "Receipts" })}</h1>
          <p className="text-label text-text-muted">
            {earnsPoints
              ? pick(locale, {
                  es: "El cliente le toma una foto a su recibo y gana puntos según el total, sin pasar por caja.",
                  en: "Customers photograph their receipt and earn points based on the total, without going to the counter.",
                })
              : pick(locale, {
                  es: "El cliente le toma una foto a su recibo y gana un sello, sin pasar por caja. Se aplica la misma espera entre sellos de tu programa.",
                  en: "Customers photograph their receipt and earn a stamp, without going to the counter. Your program's wait between stamps applies.",
                })}
          </p>
        </header>
        {settings.value.demoMode && (
          <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-label font-medium text-accent-strong">
            {pick(locale, {
              es: "Modo demo activo: se acepta cualquier recibo y las reglas de abajo no se aplican. Solo Cirix puede apagarlo.",
              en: "Demo mode is on: any receipt is accepted and the rules below don't apply. Only Cirix can turn it off.",
            })}
          </p>
        )}
        <ReceiptSettingsForm slug={business.slug} businessName={business.name} earnsPoints={earnsPoints} initial={settings.value} />
      </section>

      <section aria-labelledby="recent-receipts" className="flex flex-col gap-3">
        <h2 id="recent-receipts" className="text-body font-medium text-text">{pick(locale, { es: "Últimos recibos aceptados", en: "Latest accepted receipts" })}</h2>
        {recent.value.length === 0 ? (
          <p className="text-label text-text-muted">{pick(locale, { es: "Todavía no hay recibos.", en: "No receipts yet." })}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[36rem] border-collapse text-left text-label">
              <thead className="bg-surface text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Cliente", en: "Customer" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Total", en: "Total" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Ganó", en: "Earned" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "N.º de recibo", en: "Receipt no." })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Escaneado", en: "Scanned" })}</th>
                </tr>
              </thead>
              <tbody>
                {recent.value.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-border text-text">
                    <td className="px-4 py-2">{names.get(receipt.userId) ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{money.format(receipt.totalCents / 100)}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {receipt.points === null
                        ? pick(locale, { es: "1 sello", en: "1 stamp" })
                        : pick(locale, { es: `${receipt.points} puntos`, en: `${receipt.points} points` })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{receipt.transactionId ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2">{when.format(new Date(receipt.at))}</td>
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
