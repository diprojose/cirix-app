import { createElement, type ReactElement } from "react";
import { ImageResponse } from "next/og";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { getBrandProfile } from "@/modules/loyalty/branding/infrastructure/branding-container";

export const runtime = "nodejs";

const ALLOWED_SIZES = new Set([32, 180, 192, 512]);
const MAX_EMBEDDED_LOGO_BYTES = 1024 * 1024;
const REMOTE_LOGO_HOSTS = new Set(["firebasestorage.googleapis.com"]);

function detectLogoType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes.slice(0, 8).every(
      (byte, index) =>
        byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]
    )
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // ImageResponse cannot reliably decode WebP across all Node runtimes. Those
  // uploads use the always-present lettermark fallback instead of breaking the
  // install prompt; the storefront itself can still render the original logo.
  return null;
}

function toDataUrl(bytes: Uint8Array): string | null {
  if (bytes.byteLength > MAX_EMBEDDED_LOGO_BYTES) return null;
  const contentType = detectLogoType(bytes);
  return contentType
    ? `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`
    : null;
}

async function readResponseWithinLimit(response: Response): Promise<Uint8Array | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_EMBEDDED_LOGO_BYTES) {
        await reader.cancel("Logo exceeds the icon embedding limit");
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function loadLogoData(logoUrl: string, requestUrl: string): Promise<string | null> {
  if (!logoUrl) return null;

  try {
    const resolved = new URL(logoUrl, requestUrl);
    const isLocalPath = logoUrl.startsWith("/") && !logoUrl.startsWith("//");
    if (isLocalPath) {
      const publicRoot = resolve(process.cwd(), "public");
      const filePath = resolve(publicRoot, `.${decodeURIComponent(resolved.pathname)}`);
      if (!filePath.startsWith(`${publicRoot}${sep}`)) return null;

      const fileStats = await stat(filePath);
      if (!fileStats.isFile() || fileStats.size > MAX_EMBEDDED_LOGO_BYTES) {
        return null;
      }
      return toDataUrl(new Uint8Array(await readFile(filePath)));
    }
    if (
      resolved.protocol !== "https:" ||
      resolved.port !== "" ||
      !REMOTE_LOGO_HOSTS.has(resolved.hostname)
    ) {
      return null;
    }

    const response = await fetch(resolved, {
      cache: "force-cache",
      redirect: "error",
      signal: AbortSignal.timeout(3_000),
    });
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (
      !response.ok ||
      declaredLength > MAX_EMBEDDED_LOGO_BYTES
    ) {
      return null;
    }

    const bytes = await readResponseWithinLimit(response);
    return bytes ? toDataUrl(bytes) : null;
  } catch {
    return null;
  }
}

/** Generates a square, install-safe PNG while containing arbitrary client logos. */
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ brandSlug: string }>;
  }
) {
  const { brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  if (!brand || !brand.active) {
    return new Response("Not found", { status: 404 });
  }

  const search = new URL(request.url).searchParams;
  const requestedSize = Number(search.get("size") ?? "192");
  if (!ALLOWED_SIZES.has(requestedSize)) {
    return new Response("Unsupported icon size", { status: 400 });
  }

  const maskable = search.get("purpose") === "maskable";
  const panelRatio = maskable ? 0.56 : 0.72;
  const panelSize = Math.round(requestedSize * panelRatio);
  const logoData = await loadLogoData(brand.logoUrl, request.url);
  const initial = brand.displayName.trim().slice(0, 1).toUpperCase() || "M";

  const panelChildren: ReactElement[] = [
    createElement(
      "span",
      {
        key: "fallback",
        style: {
          color: "#000000",
          fontFamily: "Arial, sans-serif",
          fontSize: Math.round(panelSize * 0.56),
          fontWeight: 800,
          lineHeight: 1,
        },
      },
      initial
    ),
  ];

  if (logoData) {
    panelChildren.push(
      createElement("img", {
        key: "logo",
        src: logoData,
        alt: "",
        width: Math.round(panelSize * 0.8),
        height: Math.round(panelSize * 0.8),
        style: {
          position: "absolute",
          objectFit: "contain",
          backgroundColor: "#ffffff",
        },
      })
    );
  }

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: brand.primaryColor,
        },
      },
      createElement(
        "div",
        {
          style: {
            width: panelSize,
            height: panelSize,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: Math.round(panelSize * 0.24),
            backgroundColor: "#ffffff",
          },
        },
        ...panelChildren
      )
    ),
    {
      width: requestedSize,
      height: requestedSize,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
