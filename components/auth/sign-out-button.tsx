"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useLocale } from "@/components/locale-provider";
import { auth } from "@/lib/firebase/client";
import { localizeHref, pick } from "@/lib/locale";

export function SignOutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(auth).catch(() => {});
      router.push(localizeHref(locale, "/"));
      router.refresh();
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
        : pick(locale, { es: "Cerrar sesiÃ³n", en: "Sign out" })}
    </button>
  );
}
