"use client";

import { useState } from "react";
import type { Locale } from "@/lib/locale";
import type { Campaign, ReviewParticipant } from "../domain/reviews";
import { filterParticipants } from "../domain/metrics";
import s from "./reviews-dashboard.module.css";

export function ReviewParticipants({ participants, campaigns, start, end, campaignId, source, locale }: {
  participants: ReviewParticipant[]; campaigns: Campaign[]; start: string; end: string;
  campaignId: string; source: string; locale: Locale;
}) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const rows = filterParticipants(participants, start, end, campaignId, source, search, status);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 20) - 1));
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <section id="usuarios-resenas" className={s.panel}>
    <div className={s.sectionHead}><h2>{t("Estado por usuario", "Status by user")}</h2>
      <span className={s.tag}>{new Set(rows.map((row) => row.uid)).size} {t("usuarios", "users")}</span></div>
    <p className={s.muted}>{t(
      "Una fila por cuenta, campaña y canal con actividad en el período. El estado conserva el avance registrado y muestra las fechas de primera visita y primer clic. Un clic no confirma que la reseña se haya publicado.",
      "One row per account, campaign and channel active in the selected period. Status preserves recorded progress and shows the first visit and first click dates. A click does not confirm a published review.")}</p>
    <div className={s.filters}>
      <label>{t("Buscar usuario", "Find user")}<input value={search} placeholder={t("Nombre o correo", "Name or email")} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></label>
      <label>{t("Estado del usuario", "User status")}<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
        <option value="">{t("Todos los estados", "All statuses")}</option>
        <option value="opened">{t("Visitó la página · sin clic registrado", "Page session · no recorded click")}</option>
        <option value="clicked">{t("Hizo clic a Google", "Page session with a Google click")}</option>
      </select></label>
    </div>
    <div className={s.tableWrap}><table><thead><tr>
      {[t("Usuario", "User"), t("Campaña / canal", "Campaign / channel"), t("Estado", "Status"), t("Primera visita", "First visit"), t("Primer clic a Google", "First Google click"), t("Última actividad", "Last activity")].map((label) => <th scope="col" key={label}>{label}</th>)}
    </tr></thead><tbody>{rows.slice(currentPage * 20, (currentPage + 1) * 20).map((row) => <tr key={row.id}>
      <td><strong>{row.name || row.email}</strong>{row.name && <small>{row.email}</small>}</td>
      <td>{row.campaignId ? campaigns.find((campaign) => campaign.id === row.campaignId)?.name ?? t("Campaña no disponible", "Campaign unavailable") : t("Sin campaña", "No campaign")}<small>{row.source === "qr" ? "QR" : row.source}</small></td>
      <td><span className={row.clickedAt ? s.success : s.tag}>{row.clickedAt ? t("Hizo clic a Google", "Page session with a Google click") : t("Visitó la página · sin clic registrado", "Page session · no recorded click")}</span></td>
      <td>{date(row.openedAt)}</td><td>{row.clickedAt ? date(row.clickedAt) : "—"}</td><td>{date(row.lastSeenAt)}</td>
    </tr>)}</tbody></table></div>
    {!rows.length && <p className={s.empty}>{t("No hay usuarios con actividad vinculada para estos filtros.", "No users with linked activity match these filters.")}</p>}
    {rows.length > 20 && <div className={s.pagination}>
      <button className={s.button} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("Anterior", "Previous")}</button>
      <span>{currentPage + 1} / {Math.ceil(rows.length / 20)}</span>
      <button className={s.button} disabled={(currentPage + 1) * 20 >= rows.length} onClick={() => setPage(currentPage + 1)}>{t("Siguiente", "Next")}</button>
    </div>}
    <p className={s.muted}>{t("Las visitas anteriores a la vinculación permanecen anónimas. Las cuentas sin una visita registrada y las interacciones bloqueadas por controles de privacidad no aparecen en esta tabla.", "Visits recorded before account linking remain anonymous. Accounts without a recorded visit and interactions blocked by privacy controls do not appear in this table.")}</p>
  </section>;
}
