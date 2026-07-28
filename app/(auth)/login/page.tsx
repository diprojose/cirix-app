import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { COLUMN } from "@/components/store/layout";
import { getViewer } from "@/lib/auth/dal";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const locale = await getCurrentLocale();
  const viewer = await getViewer();
  if (viewer.authenticated) {
    redirect(
      await localizeForCurrentRequest(
        viewer.permissions.canOperateStore ? "/admin" : "/loyalty"
      )
    );
  }

  const { from } = await searchParams;
  const redirectTo = from && from.startsWith("/") ? from : null;

  return (
    <main
      className={`${COLUMN} flex min-h-dvh flex-1 flex-col justify-center gap-8 py-10 md:max-w-md`}
    >
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <header className="flex flex-col gap-2 text-center">
        <p className="text-h-section font-bold tracking-tight text-accent">mixmag</p>
        <h1 className="text-display font-bold tracking-tight text-text">
          {pick(locale, { es: "Bienvenido", en: "Welcome" })}
        </h1>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "Inicia sesion para hacer pedidos y acumular saldo con cada compra.",
            en: "Sign in to place orders and earn wallet credit with every purchase.",
          })}
        </p>
      </header>

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-caption text-text-muted">
        {pick(locale, { es: "Solo mirando?", en: "Just browsing?" })}{" "}
        <LocalizedLink
          href="/loyalty"
          className="rounded-sm font-medium text-accent underline underline-offset-4 transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {pick(locale, { es: "Explora la tienda", en: "Explore the store" })}
        </LocalizedLink>{" "}
        {pick(locale, {
          es: "sin iniciar sesion.",
          en: "without signing in.",
        })}
      </p>
    </main>
  );
}
