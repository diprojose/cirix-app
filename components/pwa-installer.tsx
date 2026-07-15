"use client";

import { useEffect, useState } from "react";

/**
 * Minimal `beforeinstallprompt` event typing (not yet in the DOM lib).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () =>
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch((error) => console.error("Service worker registration failed", error));
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
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

  if (isStandalone) return null;

  if (installEvent) {
    return (
      <button
        type="button"
        onClick={async () => {
          await installEvent.prompt();
          await installEvent.userChoice;
          setInstallEvent(null);
        }}
        className="fixed bottom-[6.5rem] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#e0669a] px-5 py-2.5 text-sm font-medium text-white shadow-lg md:bottom-6"
      >
        Instalar app
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className="fixed bottom-[6.5rem] left-1/2 z-50 w-[min(90vw,22rem)] -translate-x-1/2 rounded-xl bg-neutral-900/90 px-4 py-2.5 text-center text-xs text-white shadow-lg md:bottom-6">
        Para instalar: toca Compartir y luego «Agregar a la pantalla de inicio».
      </p>
    );
  }

  return null;
}
