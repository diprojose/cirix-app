import { toString } from "qrcode";

export const QR_WIDTH = 900;
export const QR_HEIGHT = 1060;

/** Brand assets are embedded so preview and downloaded PNG are self-contained. */
export async function brandedReviewQr(link: string, favicon: string, logo: string, locale: "es" | "en") {
  const qr = await toString(link, {
    type: "svg", width: 820, margin: 4, errorCorrectionLevel: "H",
    color: { dark: "#051934", light: "#ffffff" },
  });
  const embed = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_WIDTH}" height="${QR_HEIGHT}" viewBox="0 0 ${QR_WIDTH} ${QR_HEIGHT}">
    <rect width="900" height="1060" fill="#051934"/>
    <rect y="122" width="900" height="6" fill="#E5002B"/>
    <image href="${embed(logo)}" x="330" y="18" width="240" height="86"/>
    <rect x="24" y="150" width="852" height="852" rx="16" fill="#ffffff"/>
    ${qr.replace("<svg ", '<svg x="40" y="166" ')}
    <rect x="394" y="520" width="112" height="112" rx="18" fill="#ffffff"/>
    <image href="${embed(favicon)}" x="406" y="532" width="88" height="88"/>
    <text x="450" y="1038" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="#ffffff">${locale === "es" ? "ESCANEA Y COMPARTE TU EXPERIENCIA" : "SCAN TO SHARE YOUR EXPERIENCE"}</text>
  </svg>`;
}
