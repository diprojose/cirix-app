import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeListTeam } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetCustomer } from "@/modules/crm/infrastructure/di/crm-core-container";
import { ACTIVITY_PERIODS, isActivityPeriod } from "@/modules/stamp-card/application/use-cases/owner-reports";
import { makeGetStampActivity } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

const DEFAULT_PERIOD = 30;

const TILE = "flex flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3";
const PERIOD =
  "flex min-h-11 items-center justify-center rounded-pill border px-4 py-2 text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Who gave the stamps and how: per employee, staff versus table QR, and the
 * customers who use the table QR most, so an owner can spot a leaked QR photo.
 */
export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const locale = await getCurrentLocale();
  // Shows customer names, so it needs the same permission as the customer list.
  const { access } = await requireBusinessAccess(slug, "customers:read");
  if (access.business.kind === "supermarket") notFound();

  const requested = Number(typeof query.days === "string" ? query.days : DEFAULT_PERIOD);
  const days = isActivityPeriod(requested) ? requested : DEFAULT_PERIOD;
  const [report, team] = await Promise.all([
    makeGetStampActivity().execute({ businessId: access.business.id, days }),
    makeListTeam().execute(access.business.id),
  ]);
  if (!report.ok) notFound();
  const activity = report.value;

  const emails = new Map((team.ok ? team.value : []).map((member) => [member.userId, member.email]));
  const getCustomer = makeGetCustomer();
  const tableUsers = await Promise.all(
    activity.topTableCustomers.map(async (entry) => {
      const customer = await getCustomer.execute({ businessId: access.business.id, userId: entry.userId });
      return { ...entry, name: customer.ok ? customer.value.name : null, email: customer.ok ? customer.value.email : null };
    })
  );
  const tableShare = activity.totalStamps === 0 ? 0 : Math.round((activity.tableStamps / activity.totalStamps) * 100);
  const number = new Intl.NumberFormat(locale);
  const formerMember = pick(locale, { es: "Ya no está en el equipo", en: "No longer on the team" });

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Actividad", en: "Activity" })}</h1>
        <p className="text-label text-text-muted">
          {pick(locale, {
            es: "Sellos y premios de los últimos días, incluido hoy.",
            en: "Stamps and rewards over the last few days, today included.",
          })}
        </p>
      </header>

      <nav aria-label={pick(locale, { es: "Periodo", en: "Period" })} className="flex flex-wrap gap-2">
        {ACTIVITY_PERIODS.map((period) => (
          <LocalizedLink
            key={period}
            href={`/biz/${access.business.slug}/activity?days=${period}`}
            aria-current={period === days ? "page" : undefined}
            className={`${PERIOD} ${period === days ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface text-text hover:bg-stone-100"}`}
          >
            {pick(locale, { es: `${period} días`, en: `${period} days` })}
          </LocalizedLink>
        ))}
      </nav>

      <section aria-label={pick(locale, { es: "Resumen", en: "Summary" })} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={TILE}>
          <span className="text-caption text-text-muted">{pick(locale, { es: "Sellos", en: "Stamps" })}</span>
          <span className="text-title font-bold text-text">{number.format(activity.totalStamps)}</span>
        </div>
        <div className={TILE}>
          <span className="text-caption text-text-muted">{pick(locale, { es: "Por el personal", en: "By staff" })}</span>
          <span className="text-title font-bold text-text">{number.format(activity.staffStamps)}</span>
        </div>
        <div className={TILE}>
          <span className="text-caption text-text-muted">{pick(locale, { es: "Con el QR de mesa", en: "With the table QR" })}</span>
          <span className="text-title font-bold text-text">
            {number.format(activity.tableStamps)}
            {activity.totalStamps > 0 && <span className="text-label font-normal text-text-muted"> ({tableShare}%)</span>}
          </span>
        </div>
        <div className={TILE}>
          <span className="text-caption text-text-muted">{pick(locale, { es: "Premios entregados", en: "Rewards handed over" })}</span>
          <span className="text-title font-bold text-text">{number.format(activity.redemptions)}</span>
        </div>
      </section>

      <section aria-labelledby="staff-title" className="flex flex-col gap-3">
        <h2 id="staff-title" className="text-body font-medium text-text">{pick(locale, { es: "Por empleado", en: "By employee" })}</h2>
        {activity.byStaff.length === 0 ? (
          <p className="text-label text-text-muted">
            {pick(locale, { es: "Nadie del equipo selló ni entregó premios en este periodo.", en: "Nobody on the team stamped or handed over rewards in this period." })}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-left text-label">
              <thead className="bg-surface text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Empleado", en: "Employee" })}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{pick(locale, { es: "Sellos", en: "Stamps" })}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{pick(locale, { es: "Premios", en: "Rewards" })}</th>
                </tr>
              </thead>
              <tbody>
                {activity.byStaff.map((entry) => (
                  <tr key={entry.userId} className="border-t border-border text-text">
                    <td className="break-all px-4 py-2">{emails.get(entry.userId) ?? <span className="text-text-muted">{formerMember}</span>}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{number.format(entry.stamps)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{number.format(entry.redemptions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="table-title" className="flex flex-col gap-3">
        <h2 id="table-title" className="text-body font-medium text-text">
          {pick(locale, { es: "Quién más usa el QR de mesa", en: "Who uses the table QR most" })}
        </h2>
        <p className="text-label text-text-muted">
          {pick(locale, {
            es: "Si alguien suma más visitas de las que recuerdas, una foto del QR puede estar circulando: cambia el código desde «QR de mesa» y reimprime.",
            en: "If someone collects more visits than you remember, a photo of the QR may be going around: change the code from “Table QR” and reprint.",
          })}
        </p>
        {tableUsers.length === 0 ? (
          <p className="text-label text-text-muted">
            {pick(locale, { es: "Nadie selló con el QR de mesa en este periodo.", en: "Nobody stamped with the table QR in this period." })}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-left text-label">
              <thead className="bg-surface text-text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Cliente", en: "Customer" })}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{pick(locale, { es: "Correo", en: "Email" })}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{pick(locale, { es: "Sellos con QR", en: "QR stamps" })}</th>
                </tr>
              </thead>
              <tbody>
                {tableUsers.map((entry) => (
                  <tr key={entry.userId} className="border-t border-border text-text">
                    <td className="px-4 py-2">{entry.name ?? "—"}</td>
                    <td className="break-all px-4 py-2">{entry.email ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{number.format(entry.stamps)}</td>
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
