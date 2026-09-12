import type { Locale } from "@/lib/locale";

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
    slug: "pixels", title: "Pixel Hub", href: "/pixels", status: "live", accent: "brand",
    eyebrow: { es: "Inteligencia de visitantes", en: "Visitor intelligence" },
    summary: { es: "Centraliza sitios y píxeles, recibe visitas y conversiones con consentimiento y explora tus datos propios.", en: "Centralize sites and pixels, receive consented visits and conversions and explore your first-party data." },
    badge: { es: "Medición propia", en: "First-party measurement" },
    audience: { es: "Marketing y analítica", en: "Marketing and analytics" },
    ctaLabel: { es: "Abrir Pixel Hub", en: "Open Pixel Hub" },
    capabilities: [
      { es: "Registro de sitios e IDs publicitarios", en: "Site and advertising ID registry" },
      { es: "Eventos, conversiones y campañas UTM", en: "Events, conversions and UTM campaigns" },
      { es: "Control de consentimiento y duplicados", en: "Consent controls and deduplication" },
    ],
  },
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
        es: "Flujo completo: subscribers, leads, prospects y customers",
        en: "Full flow: subscribers, leads, prospects, and customers",
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
    href: "/demo/mercado-fresco",
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
  {
    slug: "n8n",
    title: "n8n Automation Studio",
    href: "/n8n",
    status: "preview",
    accent: "action",
    eyebrow: {
      es: "Suite de automatizacion",
      en: "Automation suite",
    },
    summary: {
      es: "Presenta automatizaciones operativas en formato canvas para demos de onboarding, CRM y handoffs internos.",
      en: "Present operational automations in a canvas format for onboarding, CRM, and internal handoff demos.",
    },
    badge: {
      es: "Demo visual",
      en: "Visual demo",
    },
    audience: {
      es: "Operaciones, revenue ops y preventa tecnica",
      en: "Operations, revenue ops, and technical presales",
    },
    ctaLabel: {
      es: "Abrir canvas n8n",
      en: "Open n8n canvas",
    },
    capabilities: [
      {
        es: "Canvas de nodos con flujo inspirado en automatizaciones reales",
        en: "Node canvas with flow inspired by real automations",
      },
      {
        es: "Demos de onboarding, handoff comercial y activacion operativa",
        en: "Onboarding, commercial handoff, and operational activation demos",
      },
      {
        es: "Base visual para futuras integraciones reales",
        en: "Visual foundation for future real integrations",
      },
    ],
  },
  {
    slug: "ai-support",
    title: "AI Customer Support",
    href: "/ai-support",
    status: "preview",
    accent: "brand",
    eyebrow: {
      es: "Suite de inteligencia aplicada",
      en: "Applied intelligence suite",
    },
    summary: {
      es: "Demuestra soporte conversacional para catalogo, delivery, pagos y loyalty con un modo simulado sin consumo.",
      en: "Showcase conversational support for catalog, delivery, payments, and loyalty with a zero-token simulated mode.",
    },
    badge: {
      es: "Demo controlado",
      en: "Controlled demo",
    },
    audience: {
      es: "Ecommerce, soporte y customer experience",
      en: "Ecommerce, support, and customer experience",
    },
    ctaLabel: {
      es: "Probar asistente",
      en: "Try assistant",
    },
    capabilities: [
      {
        es: "Modo simulado por defecto, sin consumo de tokens",
        en: "Simulated mode by default, with zero token usage",
      },
      {
        es: "Herramientas publicas de catalogo, delivery y loyalty",
        en: "Public catalog, delivery, and loyalty tools",
      },
      {
        es: "Activacion manual de IA real mediante configuracion",
        en: "Manual live-AI activation through configuration",
      },
    ],
  },
  {
    slug: "call-tracking",
    title: "Call Tracking",
    href: "/calls",
    status: "live",
    accent: "action",
    eyebrow: { es: "Suite de atribución telefónica", en: "Phone attribution suite" },
    summary: { es: "Mide llamadas entrantes, números únicos, atención y recurrencia con reenvío seguro mediante Twilio.", en: "Measure inbound calls, unique callers, answer performance, and repeat activity with secure Twilio forwarding." },
    badge: { es: "MVP activo", en: "Live MVP" },
    audience: { es: "Ventas, marketing y operaciones", en: "Sales, marketing, and operations" },
    ctaLabel: { es: "Ver llamadas", en: "Open calls" },
    capabilities: [
      { es: "KPIs de llamadas atendidas y perdidas", en: "Answered and missed call KPIs" },
      { es: "Historial por número con privacidad", en: "Privacy-aware history by phone" },
      { es: "Reenvío entrante sin IVR ni grabación", en: "Inbound forwarding without IVR or recording" },
    ],
  },
];
