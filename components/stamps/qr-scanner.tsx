"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";

/** How often a frame is checked for a code. Fast enough to feel instant, light on the battery. */
const SCAN_INTERVAL_MS = 250;

type NativeDetector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => NativeDetector;

/**
 * Reads a QR code from the camera. It uses the browser's built-in detector
 * where there is one (Chrome on Android) and falls back to a small decoder
 * elsewhere (Safari on iPhone). The camera needs a secure page (HTTPS or
 * localhost); when it cannot start, the parent shows manual entry instead.
 *
 * `onDetect` fires once per `active` period; set `active` back to true to scan again.
 */
export function QrScanner({ active, onDetect }: { active: boolean; onDetect: (text: string) => void }) {
  const locale = useLocale();
  const video = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<"unsupported" | "denied" | null>(null);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch {
        setProblem("denied");
        return;
      }
      if (stopped || !video.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setProblem(null);
      video.current.srcObject = stream;
      await video.current.play().catch(() => undefined);

      const Native = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      const detector = Native ? new Native({ formats: ["qr_code"] }) : null;
      const canvas = document.createElement("canvas");
      let busy = false;

      timer = setInterval(async () => {
        const element = video.current;
        if (busy || stopped || !element || element.readyState < 2 || element.videoWidth === 0) return;
        busy = true;
        try {
          let text: string | null = null;
          if (detector) {
            text = (await detector.detect(element))[0]?.rawValue ?? null;
          } else {
            const width = element.videoWidth;
            const height = element.videoHeight;
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (context) {
              context.drawImage(element, 0, 0, width, height);
              const { default: decode } = await import("jsqr");
              text = decode(context.getImageData(0, 0, width, height).data, width, height)?.data ?? null;
            }
          }
          if (text && !stopped) {
            stopped = true;
            onDetect(text);
          }
        } catch {
          // A frame that cannot be read is skipped; the next one is tried.
        } finally {
          busy = false;
        }
      }, SCAN_INTERVAL_MS);
    }

    void start();
    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, onDetect]);

  if (problem) {
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3 text-label text-text">
        {problem === "denied"
          ? pick(locale, {
              es: "No se pudo usar la cámara. Permite el acceso a la cámara en tu navegador, o ingresa el código a mano abajo.",
              en: "The camera couldn't be used. Allow camera access in your browser, or enter the code by hand below.",
            })
          : pick(locale, {
              es: "Este navegador no puede abrir la cámara (necesita una página segura). Ingresa el código a mano abajo.",
              en: "This browser can't open the camera (it needs a secure page). Enter the code by hand below.",
            })}
      </p>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-black">
      <video
        ref={video}
        muted
        playsInline
        aria-label={pick(locale, { es: "Cámara para escanear el QR del cliente", en: "Camera to scan the customer's QR" })}
        className="size-full object-cover"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
    </div>
  );
}
