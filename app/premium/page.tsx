import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  makeGetPremiumPlan,
  makeRequestPremiumUpgrade,
} from "@/modules/subscription/infrastructure/di/subscription-container";

export const metadata: Metadata = {
  title: "Suscripción premium",
};

/**
 * Premium plan screen (primary adapter). Shows the monthly price and lets a
 * signed-in customer request the upgrade. It never grants premium itself — the
 * request is recorded so an operator can contact the user and grant the claim.
 */
export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string }>;
}) {
  const viewer = await getViewer();
  const { requested } = await searchParams;

  const planResult = await makeGetPremiumPlan().execute();
  const price = planResult.ok
    ? formatPrice(planResult.value.amountCents, planResult.value.currency)
    : null;

  // Server action: record the signed-in user's interest, then confirm.
  async function requestPremium() {
    "use server";
    const current = await getViewer();
    if (!current.authenticated || !current.uid || !current.email) {
      redirect("/login?from=/premium");
    }
    await makeRequestPremiumUpgrade().execute({
      uid: current.uid,
      email: current.email,
    });
    redirect("/premium?requested=1");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recetas premium
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Accede a los video tutoriales, imágenes y recetas paso a paso de
          nuestros pasteleros.
        </p>
      </header>

      {price && (
        <div className="rounded-2xl border border-black/[.08] p-5 dark:border-white/[.145]">
          <p className="text-3xl font-semibold tracking-tight">
            {price}
            <span className="ml-1 text-base font-normal text-zinc-500">
              /mes
            </span>
          </p>
        </div>
      )}

      {viewer.tier === "premium" ? (
        <PremiumActive />
      ) : requested ? (
        <RequestConfirmation />
      ) : viewer.authenticated ? (
        <form action={requestPremium} className="flex flex-col gap-3">
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-full bg-[#e0669a] px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#d1508a]"
          >
            Quiero suscribirme
          </button>
          <p className="text-center text-xs text-zinc-500">
            Un operador te contactará para activar tu suscripción.
          </p>
        </form>
      ) : (
        <GuestPrompt />
      )}

      <footer className="mt-2 flex items-center justify-between text-sm">
        <Link
          href="/"
          className="font-medium underline underline-offset-4"
        >
          Volver a la tienda
        </Link>
        {viewer.authenticated && <SignOutButton />}
      </footer>
    </main>
  );
}

/** Shown when the viewer already has premium access. */
function PremiumActive() {
  return (
    <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      Ya eres <strong>premium</strong>. Disfruta el acceso completo a las recetas.
    </div>
  );
}

/** Shown right after a request is recorded. */
function RequestConfirmation() {
  return (
    <div className="rounded-2xl bg-zinc-100 p-5 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      ¡Solicitud recibida! Un operador te contactará pronto para activar tu
      suscripción premium.
    </div>
  );
}

/** Shown to guests: they must sign in before requesting premium. */
function GuestPrompt() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Inicia sesión para solicitar tu suscripción premium.
      </p>
      <Link
        href="/login?from=/premium"
        className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#e0669a] px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#d1508a]"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
