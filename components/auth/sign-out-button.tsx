"use client";

import { useToast } from "@/components/toast-provider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useLocale } from "@/components/locale-provider";
import {
  getFirebaseAuth,
  hasFirebaseClientConfig,
} from "@/lib/firebase/client";
import { localizeHref, pick } from "@/lib/locale";
import {
  brandHref,
  useBrand,
} from "@/modules/loyalty/branding/ui/brand-provider";

export function SignOutButton({
  className,
  redirectTo,
}: {
  className?: string;
  /** Where to land afterwards. By default, the public home page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const locale = useLocale();
  const { basePath } = useBrand();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign-out failed");
      if (hasFirebaseClientConfig) {
        const { auth } = getFirebaseAuth();
        await signOut(auth).catch(() => {});
      }
      router.replace(
        localizeHref(locale, redirectTo ?? (basePath ? brandHref("/loyalty", basePath) : "/"))
      );
      router.refresh();
    } catch {
      toast.error(pick(locale, { es: "No se pudo cerrar la sesión. Intenta de nuevo.", en: "Could not sign out. Please try again." }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={
        className ??
        "min-h-11 rounded-pill px-4 py-2 text-label font-medium text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:text-stone-400 disabled:no-underline"
      }
    >
      {loading
        ? pick(locale, { es: "Saliendo...", en: "Signing out..." })
        : pick(locale, { es: "Cerrar sesión", en: "Sign out" })}
    </button>
  );
}
