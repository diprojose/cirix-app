import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

/**
 * Login screen (primary adapter). Signed-in users are bounced away; guests get
 * the "Continue with Google" flow. Mobile-first: single column, thumb-reachable
 * button, ≥44px touch target.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.authenticated) {
    redirect("/");
  }

  const { from } = await searchParams;
  // Only allow same-site relative redirects to avoid open-redirects.
  const redirectTo = from && from.startsWith("/") ? from : "/";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 p-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenido</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Inicia sesión para hacer pedidos y, con una suscripción, acceder a las
          recetas.
        </p>
      </header>

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
        ¿Solo mirando?{" "}
        <Link href="/menu" className="font-medium underline underline-offset-4">
          Explora el menú
        </Link>{" "}
        sin iniciar sesión.
      </p>
    </main>
  );
}
