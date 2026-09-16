"use client";

import { CloseIcon } from "@/components/store/icons";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Minimal `beforeinstallprompt` event typing (not yet in the DOM lib).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// LocalStorage flag remembering the user dismissed the install prompt.
const DISMISS_KEY = "pwa-install-dismissed";

/**
 * Client component that powers the PWA install experience.
 *
 * Responsibilities:
 *  - Registers the service worker (`/sw.js`) once the page has loaded.
 *  - On Android/Chromium, captures `beforeinstallprompt` and exposes a custom
 *    install button.
 *  - On iOS Safari (which has no install prompt), shows a short instruction to
 *    add the app to the home screen.
 *
 * Renders nothing when the app is already running as an installed PWA.
 */
export function PwaInstaller() {
  const initialDismissed =
    typeof window !== "undefined" &&
    (() => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    })();
  const initialIsIOS =
    typeof navigator !== "undefined" && /ipad|iphone|ipod/i.test(navigator.userAgent);
  const initialIsStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(initialIsIOS);
  const [isStandalone] = useState(initialIsStandalone);
  const [dismissed, setDismissed] = useState(initialDismissed);
  const pathname = usePathname();

  // Once dismissed, keep the prompt hidden across visits.
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable (private mode) — dismissal lasts this session only.
    }
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () =>
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch((error) => console.error("Service worker registration failed", error));
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (isStandalone || dismissed) return null;

  // The product detail page owns the bottom of the screen with its fixed
  // "Agregar al carrito" bar, so suppress the floating install CTA there to
  // avoid stacking two controls. The service worker is still registered above.
  if (
    /^\/(?:es\/|en\/)?review\/?$/.test(pathname ?? "") ||
    pathname?.includes("/demo/") ||
    pathname?.includes("/product/") ||
    pathname?.includes("/n8n") ||
    pathname?.includes("/ai-support")
  ) return null;

  if (installEvent) {
    return (
      <div className="fixed bottom-[6.5rem] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 md:bottom-6">
        <button
          type="button"
          onClick={async () => {
            await installEvent.prompt();
            await installEvent.userChoice;
            setInstallEvent(null);
          }}
          className="inline-flex min-h-11 items-center rounded-pill bg-accent-fill px-5 text-label font-semibold text-on-accent shadow-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Instalar app
        </button>
        <DismissButton onClick={dismiss} />
      </div>
    );
  }

  if (isIOS) {
    return (
      <div className="fixed bottom-[6.5rem] left-1/2 z-50 flex w-[min(92vw,24rem)] -translate-x-1/2 items-center gap-2 md:bottom-6">
        <p className="flex-1 rounded-lg bg-accent-fill px-4 py-2.5 text-center text-caption text-on-accent shadow-float">
          Para instalar: toca Compartir y luego «Agregar a la pantalla de inicio».
        </p>
        <DismissButton onClick={dismiss} />
      </div>
    );
  }

  return null;
}

/** Small round close control that hides the install prompt. */
function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Cerrar"
      onClick={onClick}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-accent-fill text-on-accent shadow-float transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <CloseIcon className="h-4 w-4" />
    </button>
  );
}
