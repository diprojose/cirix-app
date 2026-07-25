import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { COLUMN } from "@/components/store/layout";

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
    redirect(viewer.permissions.canOperateStore ? "/admin" : "/");
  }

  const { from } = await searchParams;
  // Only allow same-site relative redirects to avoid open-redirects. When there
  // is no `from`, the destination stays null so the session route can pick it
  // from the viewer's role — an operator belongs in the panel, not the store.
  const redirectTo = from && from.startsWith("/") ? from : null;

  return (
    <main
      className={`${COLUMN} flex min-h-dvh flex-1 flex-col justify-center gap-8 py-10 md:max-w-md`}
    >
      <header className="flex flex-col gap-2 text-center">
        <p className="text-h-section font-bold tracking-tight text-accent">mixmag</p>
        <h1 className="text-display font-bold tracking-tight text-text">Bienvenido</h1>
        <p className="text-body text-text-muted">
          Inicia sesión para hacer pedidos y acumular saldo con cada compra.
        </p>
      </header>

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-caption text-text-muted">
        ¿Solo mirando?{" "}
        <Link
          href="/"
          className="rounded-sm font-medium text-accent underline underline-offset-4 transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Explora la tienda
        </Link>{" "}
        sin iniciar sesión.
      </p>
    </main>
  );
}
