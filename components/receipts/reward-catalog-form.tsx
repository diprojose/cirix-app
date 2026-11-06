"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import type { RewardDto } from "@/modules/receipts/application/dtos/reward-dtos";
import { REWARD_LIMITS } from "@/modules/receipts/domain/entities/reward";

const INPUT =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60";
const LABEL = "text-label font-medium text-text";
const PRIMARY =
  "min-h-11 rounded-pill bg-accent-fill px-5 py-2 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";
const SECONDARY =
  "min-h-11 rounded-pill border border-border bg-surface px-5 py-2 text-label font-medium text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

/** One form for adding a prize and for changing one. */
function RewardForm({
  slug,
  reward,
  onDone,
}: {
  slug: string;
  reward: RewardDto | null;
  onDone: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState(reward?.name ?? "");
  const [description, setDescription] = useState(reward?.description ?? "");
  const [points, setPoints] = useState(reward ? String(reward.points) : "");
  const [active, setActive] = useState(reward?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = reward?.id ?? "new";

  async function send(method: "POST" | "PUT" | "DELETE") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const base = `/api/member/biz/${encodeURIComponent(slug)}/rewards`;
      const response = await fetch(reward ? `${base}/${encodeURIComponent(reward.id)}` : base, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify({ name, description, points: Number(points), active }),
      });
      if (response.ok) {
        router.refresh();
        onDone();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
      setError(
        body.error?.code === "rewards/catalog-full"
          ? pick(locale, { es: `Tu catálogo llegó al límite de ${REWARD_LIMITS.maxRewards} premios.`, en: `Your catalog reached its limit of ${REWARD_LIMITS.maxRewards} rewards.` })
          : pick(locale, {
              es: `Revisa los datos: un nombre de ${REWARD_LIMITS.minName} a ${REWARD_LIMITS.maxName} letras y los puntos en número entero, de ${REWARD_LIMITS.minPoints} en adelante.`,
              en: `Check the details: a name of ${REWARD_LIMITS.minName} to ${REWARD_LIMITS.maxName} characters, and points as a whole number from ${REWARD_LIMITS.minPoints} up.`,
            })
      );
    } catch {
      setError(pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }));
    }
    setBusy(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(reward ? "PUT" : "POST");
  }

  return (
    <form onSubmit={submit} aria-busy={busy} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <label htmlFor={`reward-name-${id}`} className={LABEL}>{pick(locale, { es: "Premio", en: "Reward" })}</label>
      <input id={`reward-name-${id}`} required minLength={REWARD_LIMITS.minName} maxLength={REWARD_LIMITS.maxName} value={name}
        onChange={(event) => setName(event.target.value)} disabled={busy} className={INPUT} />

      <label htmlFor={`reward-description-${id}`} className={LABEL}>{pick(locale, { es: "Descripción (opcional)", en: "Description (optional)" })}</label>
      <input id={`reward-description-${id}`} maxLength={REWARD_LIMITS.maxDescription} value={description}
        onChange={(event) => setDescription(event.target.value)} disabled={busy} className={INPUT} />

      <label htmlFor={`reward-points-${id}`} className={LABEL}>{pick(locale, { es: "Puntos que cuesta", en: "Points it costs" })}</label>
      <input id={`reward-points-${id}`} type="number" inputMode="numeric" required min={REWARD_LIMITS.minPoints} max={REWARD_LIMITS.maxPoints} value={points}
        onChange={(event) => setPoints(event.target.value)} disabled={busy} className={INPUT} />

      <label className="flex min-h-11 items-center gap-3 text-label text-text">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={busy} className="size-5" />
        {pick(locale, { es: "Visible para los clientes", en: "Visible to customers" })}
      </label>

      {error && <p role="alert" className="text-label text-text">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={PRIMARY}>
          {busy ? pick(locale, { es: "Guardando...", en: "Saving..." }) : pick(locale, { es: "Guardar", en: "Save" })}
        </button>
        <button type="button" onClick={onDone} disabled={busy} className={SECONDARY}>{pick(locale, { es: "Cancelar", en: "Cancel" })}</button>
        {reward && (
          <button type="button" onClick={() => void send("DELETE")} disabled={busy} className={SECONDARY}>
            {pick(locale, { es: "Eliminar", en: "Delete" })}
          </button>
        )}
      </div>
    </form>
  );
}

/** The owner's prize catalog. Prices can change at any time: codes already open keep theirs. */
export function RewardCatalogForm({ slug, rewards }: { slug: string; rewards: RewardDto[] }) {
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  // The row being edited, or "new" for the empty form.
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);

  return (
    <div className="flex flex-col gap-3">
      {rewards.length === 0 && editing === null && (
        <p className="text-label text-text-muted">
          {pick(locale, { es: "Todavía no hay premios. Agrega el primero para que tus clientes puedan canjear sus puntos.", en: "No rewards yet. Add the first one so your customers can spend their points." })}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {rewards.map((reward) => (
          <li key={reward.id}>
            {editing === reward.id ? (
              <RewardForm slug={slug} reward={reward} onDone={close} />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-body font-medium text-text">{reward.name}</span>
                  {reward.description && <span className="text-caption text-text-muted">{reward.description}</span>}
                  <span className="text-caption text-text-muted">
                    {number.format(reward.points)} {pick(locale, { es: "puntos", en: "points" })}
                    {!reward.active && ` · ${pick(locale, { es: "Oculto", en: "Hidden" })}`}
                  </span>
                </div>
                <button type="button" onClick={() => setEditing(reward.id)} className={`${SECONDARY} shrink-0`}>
                  {pick(locale, { es: "Editar", en: "Edit" })}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <RewardForm slug={slug} reward={null} onDone={close} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={`${PRIMARY} w-full`}>
          {pick(locale, { es: "Agregar premio", en: "Add reward" })}
        </button>
      )}
    </div>
  );
}
