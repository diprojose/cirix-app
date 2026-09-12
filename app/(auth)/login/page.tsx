import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginBrandHeader } from "@/components/auth/login-brand-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { COLUMN } from "@/components/store/layout";
import { getViewer } from "@/lib/auth/dal";
import {
  getCurrentLocale,
  localizeForCurrentRequest,
  localizeHref,
  pick,
} from "@/lib/i18n";

const INTERNAL_ORIGIN = "https://internal.invalid";

/** Rejects protocol-relative, backslash and otherwise external return targets. */
function safeInternalPath(value: string | undefined): string | null {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN || /^\/(?:es\/|en\/)?login\/?$/.test(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ from }, locale, viewer] = await Promise.all([
    searchParams,
    getCurrentLocale(),
    getViewer(),
  ]);
  const internalFrom = safeInternalPath(from);
  const redirectTo = internalFrom ? localizeHref(locale, internalFrom) : null;

  if (viewer.authenticated) {
    redirect(
      redirectTo ??
        (await localizeForCurrentRequest(
          viewer.permissions.canOperateStore ? "/admin" : "/loyalty"
        ))
    );
  }

  return (
    <main
      className={`${COLUMN} flex min-h-dvh flex-1 flex-col justify-center gap-8 py-10 md:max-w-md`}
    >
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <LoginBrandHeader />

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-caption text-text-muted">
        <LocalizedLink
          href="/"
          className="rounded-sm font-medium text-accent underline underline-offset-4 transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {pick(locale, { es: "Volver a la página principal", en: "Back to the home page" })}
        </LocalizedLink>
      </p>
    </main>
  );
}
