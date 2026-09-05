import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER } from "./layout";
import { RepeatIcon, UserIcon, WalletIcon } from "./icons";

const BENEFITS = [
  {
    title: "Saldo por tus compras",
    copy: "Cada pedido confirmado suma crédito que podrás usar más adelante.",
    icon: WalletIcon,
  },
  {
    title: "Beneficios por volver",
    copy: "Mantén tu racha semanal y desbloquea promociones especiales.",
    icon: RepeatIcon,
  },
  {
    title: "Invita y gana",
    copy: "Comparte tu enlace y recibe recompensas cuando tus amigos compren.",
    icon: UserIcon,
  },
] as const;

export function LoyaltyValueStrip() {
  return (
    <section className={`${CONTAINER} mt-14 md:mt-20`} aria-labelledby="benefits-title">
      <div className="overflow-hidden rounded-[1.75rem] bg-accent-fill px-5 py-8 text-on-accent md:px-10 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em]">Tu compra vale más</p>
            <h2 id="benefits-title" className="mt-2 max-w-xl font-heading text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Beneficios que crecen contigo.
            </h2>
          </div>
          <LocalizedLink
            href="/billetera"
            className="inline-flex min-h-11 w-fit items-center rounded-xl border border-current/40 px-4 text-sm font-bold underline-offset-4 transition-colors hover:underline"
          >
            Ver mis beneficios →
          </LocalizedLink>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {BENEFITS.map(({ title, copy, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-current/30 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-current/30">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-bold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
