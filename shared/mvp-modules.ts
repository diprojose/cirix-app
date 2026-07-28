export type MvpModuleStatus = "live" | "preview";

export type BilingualCopy = {
  es: string;
  en: string;
};

export type MvpModule = {
  slug: string;
  eyebrow: BilingualCopy;
  title: string;
  summary: BilingualCopy;
  href: string;
  status: MvpModuleStatus;
  badge: BilingualCopy;
  accent: "brand" | "action";
  audience: BilingualCopy;
  ctaLabel: BilingualCopy;
  capabilities: BilingualCopy[];
};

export const MVP_MODULES: MvpModule[] = [
  {
    slug: "zoho-crm",
    eyebrow: {
      es: "Suite de relacionamiento",
      en: "Relationship suite",
    },
    title: "Zoho CRM",
    summary: {
      es: "Centraliza seguimiento comercial, visibilidad operativa y conversaciones activas en una sola vista.",
      en: "Centralize sales follow-up, operator visibility, and active conversations in one operating view.",
    },
    href: "/zoho",
    status: "live",
    badge: {
      es: "MVP activo",
      en: "Live MVP",
    },
    accent: "action",
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
        es: "Flujos de atención y visibilidad del equipo",
        en: "Service workflows and team visibility",
      },
      {
        es: "Operación lista para demos y discovery",
        en: "Demo-ready operator workspace",
      },
    ],
  },
  {
    slug: "loyalty",
    eyebrow: {
      es: "Suite de retención",
      en: "Retention suite",
    },
    title: "Loyalty Commerce",
    summary: {
      es: "Activa recompensas, referidos y compra recurrente desde un storefront conectado con lógica de retención.",
      en: "Activate rewards, referrals, and repeat purchase flows from a storefront connected to retention logic.",
    },
    href: "/loyalty",
    status: "live",
    badge: {
      es: "Suite comercial",
      en: "Commerce suite",
    },
    accent: "brand",
    audience: {
      es: "Comercio, retención y operaciones",
      en: "Commerce, retention, and operations",
    },
    ctaLabel: {
      es: "Ver loyalty commerce",
      en: "Open loyalty commerce",
    },
    capabilities: [
      {
        es: "Wallet de recompensas y crédito promocional",
        en: "Rewards wallet and promotional credit",
      },
      {
        es: "Referidos, checkout y recompra",
        en: "Referrals, checkout, and repeat purchase",
      },
      {
        es: "Base para activaciones de CRM y campañas",
        en: "Foundation for CRM activations and campaigns",
      },
    ],
  },
];
