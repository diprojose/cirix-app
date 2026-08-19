import Link from "next/link";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type { CallStatus, TrackedCall } from "../domain/call";
import type { CallListFilters } from "../application/call-tracking-service";
import { maskPhoneNumber } from "./phone-format";

type Stats = Awaited<ReturnType<import("../application/call-tracking-service").CallTrackingService["stats"]>>;

export function CallsDashboard({
  locale,
  timeZone,
  trialMode,
  configured,
  filters,
  calls,
  total,
  stats,
}: {
  locale: Locale;
  timeZone: string;
  trialMode: boolean;
  configured: boolean;
  filters: CallListFilters;
  calls: TrackedCall[];
  total: number;
  stats: Stats;
}) {
  return (
    <div className="space-y-6">
      {(trialMode || !configured) && (
        <div className="rounded-2xl border border-action-fill/30 bg-action-subtle px-4 py-3 text-sm text-action-strong">
          {trialMode
            ? pick(locale, { es: "Modo Trial activo. Los webhooks continúan validando su firma.", en: "Trial mode is active. Webhook signatures remain enforced." })
            : pick(locale, { es: "La integración Twilio aún no tiene toda su configuración.", en: "The Twilio integration is not fully configured yet." })}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Call Tracking</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.03em] text-text">
          {pick(locale, { es: "Llamadas", en: "Calls" })}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {pick(locale, { es: "Llamadas entrantes, atención y recurrencia por número.", en: "Inbound calls, answer performance, and repeat callers." })}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={pick(locale, { es: "Total", en: "Total" })} value={stats.totalCalls} />
        <Kpi label={pick(locale, { es: "Únicos", en: "Unique" })} value={stats.uniqueCallers} />
        <Kpi label={pick(locale, { es: "Atendidas", en: "Answered" })} value={stats.answeredCalls} />
        <Kpi label={pick(locale, { es: "Perdidas", en: "Missed" })} value={stats.missedCalls} />
      </section>

      <div className="flex flex-wrap gap-2 text-sm text-text-muted">
        <span className="rounded-pill bg-surface px-4 py-2 shadow-xs">{stats.answerRate}% {pick(locale, { es: "atendidas", en: "answer rate" })}</span>
        <span className="rounded-pill bg-surface px-4 py-2 shadow-xs">{formatDuration(stats.averageDurationSeconds)} {pick(locale, { es: "promedio", en: "average" })}</span>
        <span className="rounded-pill bg-surface px-4 py-2 shadow-xs">{stats.repeatCalls} {pick(locale, { es: "repetidas", en: "repeat calls" })}</span>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl bg-surface p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-5">
        <Filter label={pick(locale, { es: "Desde", en: "From" })}><input name="from" type="date" defaultValue={filters.from ?? ""} className="field" /></Filter>
        <Filter label={pick(locale, { es: "Hasta", en: "To" })}><input name="to" type="date" defaultValue={filters.to ?? ""} className="field" /></Filter>
        <Filter label={pick(locale, { es: "Estado", en: "Status" })}>
          <select name="status" defaultValue={filters.status ?? ""} className="field">
            <option value="">{pick(locale, { es: "Todos", en: "All" })}</option>
            {(["initiated", "ringing", "answered", "completed", "no_answer", "busy", "failed", "canceled"] as CallStatus[]).map((status) => <option key={status} value={status}>{statusLabel(locale, status)}</option>)}
          </select>
        </Filter>
        <Filter label={pick(locale, { es: "Teléfono E.164", en: "E.164 phone" })}><input name="phone" defaultValue={filters.phone ?? ""} placeholder="+58412…" className="field" /></Filter>
        <button className="min-h-11 self-end rounded-xl bg-action-fill px-4 text-sm font-semibold text-white hover:bg-action-strong">
          {pick(locale, { es: "Filtrar", en: "Filter" })}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl bg-surface shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-lg font-bold text-text">{pick(locale, { es: "Historial", en: "History" })}</h2>
          <span className="text-xs text-text-muted">{total} {pick(locale, { es: "registros", en: "records" })}</span>
        </div>
        {calls.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-text-muted">{pick(locale, { es: "No hay llamadas para estos filtros.", en: "No calls match these filters." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-bg text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-4 py-3">{pick(locale, { es: "Teléfono", en: "Phone" })}</th><th className="px-4 py-3">{pick(locale, { es: "Fecha", en: "Date" })}</th><th className="px-4 py-3">{pick(locale, { es: "Hora", en: "Time" })}</th><th className="px-4 py-3">{pick(locale, { es: "Duración", en: "Duration" })}</th><th className="px-4 py-3">{pick(locale, { es: "Estado", en: "Status" })}</th></tr></thead>
              <tbody className="divide-y divide-border">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-bg/60">
                    <td className="px-4 py-4 font-medium text-text"><Link className="hover:text-accent" href={localizeHref(locale, `/calls/${encodeURIComponent(call.id)}`)}>{maskPhoneNumber(call.callerPhone)}</Link></td>
                    <td className="px-4 py-4 text-text-muted">{formatDate(call.startedAt, locale, timeZone)}</td>
                    <td className="px-4 py-4 text-text-muted">{formatTime(call.startedAt, locale, timeZone)}</td>
                    <td className="px-4 py-4 tabular-nums text-text-muted">{call.durationSeconds === null ? "—" : formatDuration(call.durationSeconds)}</td>
                    <td className="px-4 py-4"><StatusBadge locale={locale} status={call.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination locale={locale} filters={filters} total={total} />
      </section>
    </div>
  );
}

export function CallDetail({ locale, timeZone, call, history }: { locale: Locale; timeZone: string; call: TrackedCall; history: { totalCalls: number; firstCallAt: string | null; lastCallAt: string | null } }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={localizeHref(locale, "/calls")} className="text-sm font-semibold text-accent hover:underline">← {pick(locale, { es: "Volver a llamadas", en: "Back to calls" })}</Link>
      <section className="rounded-2xl bg-surface p-5 shadow-xs">
        <h1 className="font-heading text-2xl font-bold text-text">{pick(locale, { es: "Llamada", en: "Call" })}</h1>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Detail label={pick(locale, { es: "Teléfono", en: "Phone" })} value={call.callerPhone} />
          <Detail label={pick(locale, { es: "Estado", en: "Status" })} value={statusLabel(locale, call.status)} />
          <Detail label={pick(locale, { es: "Fecha", en: "Date" })} value={formatDate(call.startedAt, locale, timeZone)} />
          <Detail label={pick(locale, { es: "Hora", en: "Time" })} value={formatTime(call.startedAt, locale, timeZone)} />
          <Detail label={pick(locale, { es: "Duración", en: "Duration" })} value={call.durationSeconds === null ? "—" : formatDuration(call.durationSeconds)} />
          <Detail label={pick(locale, { es: "Primera llamada", en: "First call" })} value={history.firstCallAt ? formatDate(history.firstCallAt, locale, timeZone) : "—"} />
          <Detail label={pick(locale, { es: "Última llamada", en: "Last call" })} value={history.lastCallAt ? formatDate(history.lastCallAt, locale, timeZone) : "—"} />
          <Detail label={pick(locale, { es: "Total de llamadas", en: "Total calls" })} value={String(history.totalCalls)} />
        </dl>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-surface p-5 shadow-xs"><p className="font-heading text-3xl font-extrabold tabular-nums text-text">{value}</p><p className="mt-1 text-sm text-text-muted">{label}</p></div>; }
function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-semibold text-text-muted">{label}{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt><dd className="mt-1 break-words text-base font-semibold text-text">{value}</dd></div>; }
function StatusBadge({ locale, status }: { locale: Locale; status: CallStatus }) { return <span className="inline-flex rounded-pill bg-bg px-3 py-1 text-xs font-semibold text-text">{statusLabel(locale, status)}</span>; }

function Pagination({ locale, filters, total }: { locale: Locale; filters: CallListFilters; total: number }) {
  const pages = Math.max(1, Math.ceil(total / filters.limit));
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.status) params.set("status", filters.status);
    if (filters.phone) params.set("phone", filters.phone);
    params.set("page", String(page));
    return `${localizeHref(locale, "/calls")}?${params}`;
  };
  return <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm"><span className="text-text-muted">{filters.page} / {pages}</span><div className="flex gap-2">{filters.page > 1 && <Link className="rounded-xl border border-border px-3 py-2" href={href(filters.page - 1)}>{pick(locale, { es: "Anterior", en: "Previous" })}</Link>}{filters.page < pages && <Link className="rounded-xl border border-border px-3 py-2" href={href(filters.page + 1)}>{pick(locale, { es: "Siguiente", en: "Next" })}</Link>}</div></div>;
}

function statusLabel(locale: Locale, status: CallStatus): string {
  const labels: Record<CallStatus, Record<Locale, string>> = {
    initiated: { es: "Iniciada", en: "Initiated" }, ringing: { es: "Sonando", en: "Ringing" }, answered: { es: "Atendida", en: "Answered" }, completed: { es: "Atendida", en: "Completed" }, no_answer: { es: "No contestada", en: "No answer" }, busy: { es: "Ocupado", en: "Busy" }, failed: { es: "Fallida", en: "Failed" }, canceled: { es: "Cancelada", en: "Canceled" },
  };
  return pick(locale, labels[status]);
}
function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60); const rest = seconds % 60; return `${minutes}:${String(rest).padStart(2, "0")}`; }
function formatDate(value: string, locale: Locale, timeZone: string) { return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { dateStyle: "medium", timeZone }).format(new Date(value)); }
function formatTime(value: string, locale: Locale, timeZone: string) { return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { timeStyle: "short", timeZone }).format(new Date(value)); }

