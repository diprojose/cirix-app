"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import type { StampProgramDto } from "@/modules/stamp-card/application/dtos/stamp-card-dto";
import { STAMP_LIMITS } from "@/modules/stamp-card/domain/value-objects/stamp-program";

const INPUT =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60";

/** The owner's form for the stamp rules. Changes apply to future stamps only. */
export function ProgramForm({ slug, initial }: { slug: string; initial: StampProgramDto }) {
  const locale = useLocale();
  const [requiredStamps, setRequiredStamps] = useState(String(initial.requiredStamps));
  const [rewardName, setRewardName] = useState(initial.rewardName);
  const [cooldownMinutes, setCooldownMinutes] = useState(String(initial.cooldownMinutes));
  const [active, setActive] = useState(initial.active);
  const [tableStamps, setTableStamps] = useState(initial.tableStamps);
  const minCooldown = tableStamps ? STAMP_LIMITS.minTableCooldownMinutes : STAMP_LIMITS.minCooldownMinutes;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/member/biz/${encodeURIComponent(slug)}/program`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredStamps: Number(requiredStamps),
          rewardName,
          cooldownMinutes: Number(cooldownMinutes),
          active,
          tableStamps,
        }),
      });
      setMessage(
        response.ok
          ? { kind: "ok", text: pick(locale, { es: "Programa guardado.", en: "Program saved." }) }
          : {
              kind: "error",
              text: pick(locale, {
                es: `Revisa los valores: visitas de ${STAMP_LIMITS.minStamps} a ${STAMP_LIMITS.maxStamps}, premio de 2 a 60 letras y espera de ${minCooldown} a ${STAMP_LIMITS.maxCooldownMinutes} minutos.`,
                en: `Check the values: ${STAMP_LIMITS.minStamps} to ${STAMP_LIMITS.maxStamps} visits, a 2 to 60 character reward, and a wait of ${minCooldown} to ${STAMP_LIMITS.maxCooldownMinutes} minutes.`,
              }),
            }
      );
    } catch {
      setMessage({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-busy={saving}>
      <label htmlFor="program-stamps" className="text-label font-medium text-text">
        {pick(locale, { es: "Visitas para ganar el premio", en: "Visits to earn the reward" })}
      </label>
      <input id="program-stamps" type="number" inputMode="numeric" min={STAMP_LIMITS.minStamps} max={STAMP_LIMITS.maxStamps} required
        value={requiredStamps} onChange={(event) => setRequiredStamps(event.target.value)} disabled={saving} className={INPUT} />

      <label htmlFor="program-reward" className="text-label font-medium text-text">
        {pick(locale, { es: "Premio", en: "Reward" })}
      </label>
      <input id="program-reward" required minLength={STAMP_LIMITS.minRewardName} maxLength={STAMP_LIMITS.maxRewardName}
        value={rewardName} onChange={(event) => setRewardName(event.target.value)} disabled={saving} className={INPUT} />

      <label htmlFor="program-cooldown" className="text-label font-medium text-text">
        {pick(locale, { es: "Espera entre visitas (minutos)", en: "Wait between visits (minutes)" })}
      </label>
      <input id="program-cooldown" type="number" inputMode="numeric" min={minCooldown} max={STAMP_LIMITS.maxCooldownMinutes} required
        value={cooldownMinutes} onChange={(event) => setCooldownMinutes(event.target.value)} disabled={saving} aria-describedby="program-cooldown-help" className={INPUT} />
      <p id="program-cooldown-help" className="text-caption text-text-muted">
        {pick(locale, {
          es: "Evita que una misma visita cuente varias veces. 240 min (4 horas) es un buen punto de partida.",
          en: "Stops a single visit from counting more than once. 240 min (4 hours) is a good starting point.",
        })}
      </p>

      <label className="flex min-h-11 items-center gap-3 text-label text-text">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={saving} className="size-5" />
        {pick(locale, { es: "Programa activo", en: "Program active" })}
      </label>

      <label className="flex min-h-11 items-center gap-3 text-label text-text">
        <input type="checkbox" checked={tableStamps} onChange={(event) => setTableStamps(event.target.checked)} disabled={saving}
          aria-describedby="program-table-help" className="size-5" />
        {pick(locale, { es: "El cliente registra su visita con el QR de la mesa", en: "Customers record their visit with the table QR" })}
      </label>
      <p id="program-table-help" className="text-caption text-text-muted">
        {pick(locale, {
          es: `El cliente escanea el QR impreso y registra su visita sin pasar por caja. Es más cómodo pero menos seguro: una foto del QR sirve desde cualquier lugar. Por eso la espera mínima sube a ${STAMP_LIMITS.minTableCooldownMinutes} minutos, y si ves abuso puedes cambiar el código y reimprimir. El personal puede seguir registrando visitas como siempre.`,
          en: `Customers scan the printed QR and record their visit without going to the counter. It's more convenient but less secure: a photo of the QR works from anywhere. That's why the minimum wait rises to ${STAMP_LIMITS.minTableCooldownMinutes} minutes, and if you see abuse you can change the code and reprint. Staff can keep recording visits as usual.`,
        })}
      </p>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="text-label text-text">
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving}
        className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60">
        {saving ? pick(locale, { es: "Guardando...", en: "Saving..." }) : pick(locale, { es: "Guardar", en: "Save" })}
      </button>
    </form>
  );
}
