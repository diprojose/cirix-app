"use client";

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
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
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

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // Ignore storage read failures.
    }

    setIsIOS(/ipad|iphone|ipod/i.test(navigator.userAgent));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari exposes standalone mode on the navigator instead.
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );

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
  if (pathname?.startsWith("/product/")) return null;

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
          className="rounded-full bg-[#e0669a] px-5 py-2.5 text-sm font-medium text-white shadow-lg"
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
        <p className="flex-1 rounded-xl bg-neutral-900/90 px-4 py-2.5 text-center text-xs text-white shadow-lg">
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
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-900/90 text-white shadow-lg"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
