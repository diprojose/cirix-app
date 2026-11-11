"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { TeamMemberDto } from "@/core/tenancy/application/use-cases/manage-team";
import type { MemberRole } from "@/core/tenancy/domain/value-objects/member-role";

const INPUT =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60";
const BUTTON =
  "flex min-h-11 items-center justify-center rounded-pill px-5 py-2 text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

const roleLabel = (locale: Locale, role: MemberRole) =>
  role === "owner" ? pick(locale, { es: "Propietario", en: "Owner" }) : pick(locale, { es: "Personal", en: "Staff" });

/** Why a change failed, in words the owner can act on. */
function errorText(locale: Locale, code: string | undefined): string {
  switch (code) {
    case "tenancy/invalid-membership":
      return pick(locale, { es: "Escribe un correo válido.", en: "Enter a valid email." });
    case "tenancy/team-change-denied":
      return pick(locale, {
        es: "Tu rol no puede hacer este cambio. Para cambiar propietarios, escribe a Cirix.",
        en: "Your role cannot make this change. To change owners, contact Cirix.",
      });
    case "tenancy/last-owner":
      return pick(locale, { es: "El negocio debe tener al menos un propietario.", en: "The business must keep at least one owner." });
    case "tenancy/team-full":
      return pick(locale, { es: "El equipo llegó al máximo de personas.", en: "The team reached its maximum size." });
    case "tenancy/account-disabled":
      return pick(locale, { es: "Esa cuenta está desactivada. Escribe a Cirix.", en: "That account is disabled. Contact Cirix." });
    case "tenancy/member-not-found":
      return pick(locale, { es: "Esa persona ya no está en el equipo.", en: "That person is no longer on the team." });
    default:
      return pick(locale, { es: "No se pudo guardar. Intenta de nuevo.", en: "Could not save. Please try again." });
  }
}

/**
 * The team list with add and remove. The server decides what the viewer may
 * change; `manageable` only hides controls that would be refused anyway.
 */
export function TeamManager({
  slug,
  team,
  viewerId,
  manageable,
}: {
  slug: string;
  team: TeamMemberDto[];
  viewerId: string;
  manageable: readonly MemberRole[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>(manageable.includes("staff") ? "staff" : manageable[0] ?? "staff");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const endpoint = `/api/member/biz/${encodeURIComponent(slug)}/team`;

  async function send(method: "POST" | "DELETE", body: Record<string, string>): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) return true;
      const payload = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
      setMessage({ kind: "error", text: errorText(locale, payload?.error?.code) });
    } catch {
      setMessage({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    }
    return false;
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy("add");
    setMessage(null);
    const address = email.trim().toLowerCase();
    if (await send("POST", { email: address, role })) {
      setEmail("");
      setMessage({
        kind: "ok",
        text: pick(locale, {
          es: `Listo. ${address} entra con ese correo (Google o enlace) y verá el negocio en su cuenta.`,
          en: `Done. ${address} signs in with that email (Google or a link) and will see the business in their account.`,
        }),
      });
      router.refresh();
    }
    setBusy(null);
  }

  async function remove(member: TeamMemberDto) {
    if (busy) return;
    const confirmed = window.confirm(
      pick(locale, {
        es: `¿Quitar a ${member.email} del equipo? Pierde el acceso al instante.`,
        en: `Remove ${member.email} from the team? They lose access immediately.`,
      })
    );
    if (!confirmed) return;
    setBusy(member.userId);
    setMessage(null);
    if (await send("DELETE", { userId: member.userId })) {
      setMessage({ kind: "ok", text: pick(locale, { es: `${member.email} ya no está en el equipo.`, en: `${member.email} is no longer on the team.` }) });
      router.refresh();
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border" aria-label={pick(locale, { es: "Equipo", en: "Team" })}>
        {team.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="break-all text-body text-text">
                {member.email}
                {member.userId === viewerId && (
                  <span className="text-text-muted"> {pick(locale, { es: "(tú)", en: "(you)" })}</span>
                )}
              </span>
              <span className="text-caption text-text-muted">
                {roleLabel(locale, member.role)} · {pick(locale, { es: "desde", en: "since" })} {date.format(new Date(member.createdAt))}
              </span>
            </div>
            {manageable.includes(member.role) && member.userId !== viewerId && (
              <button
                type="button"
                onClick={() => remove(member)}
                disabled={busy !== null}
                className={`${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`}
              >
                {busy === member.userId ? pick(locale, { es: "Quitando…", en: "Removing…" }) : pick(locale, { es: "Quitar", en: "Remove" })}
              </button>
            )}
          </li>
        ))}
      </ul>

      {manageable.length > 0 && (
        <form onSubmit={add} className="flex flex-col gap-3" aria-busy={busy === "add"}>
          <h2 className="text-body font-medium text-text">{pick(locale, { es: "Agregar al equipo", en: "Add to the team" })}</h2>
          <label htmlFor="team-email" className="text-label font-medium text-text">
            {pick(locale, { es: "Correo de la persona", en: "Their email" })}
          </label>
          <input id="team-email" type="email" required maxLength={254} autoComplete="off" value={email}
            onChange={(event) => setEmail(event.target.value)} disabled={busy !== null} aria-describedby="team-email-help" className={INPUT} />
          <p id="team-email-help" className="text-caption text-text-muted">
            {pick(locale, {
              es: "Usa el correo con el que va a entrar (su cuenta de Google o uno donde reciba el enlace). El personal solo puede escanear y registrar visitas; no ve la lista de clientes.",
              en: "Use the email they will sign in with (their Google account, or one where they get the link). Staff can only scan and record visits; they do not see the customer list.",
            })}
          </p>
          {manageable.length > 1 && (
            <>
              <label htmlFor="team-role" className="text-label font-medium text-text">{pick(locale, { es: "Rol", en: "Role" })}</label>
              <select id="team-role" value={role} onChange={(event) => setRole(event.target.value as MemberRole)} disabled={busy !== null} className={INPUT}>
                {manageable.map((option) => (
                  <option key={option} value={option}>{roleLabel(locale, option)}</option>
                ))}
              </select>
            </>
          )}
          <button type="submit" disabled={busy !== null} className={`${BUTTON} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}>
            {busy === "add" ? pick(locale, { es: "Agregando…", en: "Adding…" }) : pick(locale, { es: "Agregar", en: "Add" })}
          </button>
        </form>
      )}

      <p role="status" aria-live="polite" className={`text-label ${message?.kind === "error" ? "text-danger" : "text-text-muted"}`}>
        {message?.text}
      </p>
    </div>
  );
}
