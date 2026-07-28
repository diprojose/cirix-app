import type { Locale } from "@/lib/i18n";

export type MvpModuleStatus = "live" | "preview";

export type MvpModule = {
  slug: string;
  title: string;
  href: string;
  status: MvpModuleStatus;
  accent: "brand" | "action";
  eyebrow: Record<Locale, string>;
  summary: Record<Locale, string>;
  badge: Record<Locale, string>;
  audience: Record<Locale, string>;
  ctaLabel: Record<Locale, string>;
  capabilities: Record<Locale, string>[];
};

export const MVP_MODULES: MvpModule[] = [
  {
    slug: "zoho-crm",
    title: "Zoho CRM",
    href: "/zoho",
    status: "live",
    accent: "action",
    eyebrow: {
      es: "Suite de relacionamiento",
      en: "Relationship suite",
    },
    summary: {
      es: "Centraliza seguimiento comercial, visibilidad operativa y conversaciones activas en una sola vista.",
      en: "Centralize sales follow-up, operator visibility, and active conversations in one operating view.",
    },
    badge: {
      es: "MVP activo",
      en: "Live MVP",
    },
    audience: {
      es: "Ventas, soporte y customer success",
      en: "Sales, support, and customer success",
    },
    ctaLabel: {
      es: "Ver suite CRM",
      en: "Open CRM suite",
    },
    capabilities: [
      {
        es: "Seguimiento de leads y cuentas",
        en: "Lead and account follow-up",
      },
      {
        es: "Flujos de atencion y visibilidad del equipo",
        en: "Service workflows and team visibility",
      },
      {
        es: "Operacion lista para demos y discovery",
        en: "Demo-ready operator workspace",
      },
    ],
  },
  {
    slug: "loyalty",
    title: "Loyalty Commerce",
    href: "/loyalty",
    status: "live",
    accent: "brand",
    eyebrow: {
      es: "Suite de retencion",
      en: "Retention suite",
    },
    summary: {
      es: "Activa recompensas, referidos y compra recurrente desde un storefront conectado con logica de retencion.",
      en: "Activate rewards, referrals, and repeat purchase flows from a storefront connected to retention logic.",
    },
    badge: {
      es: "Suite comercial",
      en: "Commerce suite",
    },
    audience: {
      es: "Comercio, retencion y operaciones",
      en: "Commerce, retention, and operations",
    },
    ctaLabel: {
      es: "Ver loyalty commerce",
      en: "Open loyalty commerce",
    },
    capabilities: [
      {
        es: "Wallet de recompensas y credito promocional",
        en: "Rewards wallet and promotional credit",
      },
      {
        es: "Referidos, checkout y recompra",
        en: "Referrals, checkout, and repeat purchase",
      },
      {
        es: "Base para activaciones de CRM y campanas",
        en: "Foundation for CRM activations and campaigns",
      },
    ],
  },
];
