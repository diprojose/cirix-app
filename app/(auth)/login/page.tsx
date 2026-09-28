import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { LoginBrandHeader } from "@/components/auth/login-brand-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { COLUMN } from "@/components/store/layout";
import { getViewer, getReviewViewer } from "@/lib/auth/dal";
import { isReviewPage } from "@/lib/auth/route-access";
import { stripLocaleFromPathname } from "@/lib/locale";
import { safeInternalPath } from "@/lib/auth/return-path";
import {
  getCurrentLocale,
  localizeForCurrentRequest,
  localizeHref,
  pick,
} from "@/lib/i18n";

const INTERNAL_ORIGIN = "https://internal.invalid";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; emailSignIn?: string | string[] }>;
}) {
  const [{ from, emailSignIn }, locale] = await Promise.all([
    searchParams,
    getCurrentLocale(),
  ]);
  const internalFrom = safeInternalPath(from);
  const redirectTo = internalFrom ? localizeHref(locale, internalFrom) : null;
  const reviewLogin = internalFrom !== null && isReviewPage(
    stripLocaleFromPathname(new URL(internalFrom, INTERNAL_ORIGIN).pathname).pathname
  );
  const viewer = await (reviewLogin ? getReviewViewer() : getViewer());

  // An email link may belong to another account; only Firebase can validate it.
  // Do not skip its confirmation just because this browser has an older cookie.
  const completeEmailLink = emailSignIn === "1";
  if (viewer.authenticated && !completeEmailLink) {
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

      <LoginBrandHeader reviewLogin={reviewLogin} />

      {!completeEmailLink && <GoogleSignInButton redirectTo={redirectTo} reviewLogin={reviewLogin} />}
      {!completeEmailLink && <div className="flex items-center gap-3 text-caption text-text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />{pick(locale, { es: "o", en: "or" })}<span className="h-px flex-1 bg-border" />
      </div>}
      <EmailSignInForm redirectTo={redirectTo} reviewLogin={reviewLogin} completeLink={completeEmailLink} />

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
