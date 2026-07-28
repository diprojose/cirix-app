export type MvpModuleStatus = "live" | "preview";

export type MvpModule = {
  slug: string;
  title: string;
  summary: string;
  href: string;
  status: MvpModuleStatus;
  badge: string;
  accent: "brand" | "action";
  audience: string;
};

export const MVP_MODULES: MvpModule[] = [
  {
    slug: "hozo-crm",
    title: "Hozo CRM",
    summary:
      "A CRM demo focused on account intelligence, follow-up flows, and operator visibility.",
    href: "/hozo",
    status: "live",
    badge: "New demo",
    accent: "action",
    audience: "Sales, support, and customer success teams",
  },
  {
    slug: "loyalty",
    title: "Loyalty Commerce",
    summary:
      "The current grocery and retention MVP with wallet credit, referrals, and checkout flows.",
    href: "/loyalty",
    status: "live",
    badge: "Current MVP",
    accent: "brand",
    audience: "Commerce, retention, and operations teams",
  },
];
