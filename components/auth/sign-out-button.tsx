"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

/**
 * Client component that logs the user out: clears the server session cookie via
 * `DELETE /api/auth/session`, signs out of the Firebase client SDK, then
 * refreshes so Server Components re-render as a guest.
 */
export function SignOutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(auth).catch(() => {
        // Client sign-out is best-effort; the server cookie is already cleared.
      });
      router.push("/");
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
        "min-h-[44px] rounded-full px-4 py-2 text-sm font-medium text-zinc-600 underline-offset-4 hover:underline disabled:opacity-60 dark:text-zinc-400"
      }
    >
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
