import type { ReactNode } from "react";
import { BusinessSidebar, BusinessTabBar, type BusinessNavItem } from "@/components/biz/business-nav";
import { CONTAINER_READ } from "@/components/store/layout";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { roleCan } from "@/core/tenancy/domain/value-objects/member-role";

/**
 * The membership gate for EVERY page under /biz/<slug>, and the panel's frame:
 * the business name and the menu stay in place while pages change. The proxy
 * lets any verified account reach this area, so this layout is what keeps
 * outsiders out: without a role in this business they get a 404. Pages below
 * still check the specific permission they need (for example `customers:read`).
 *
 * The menu is a column at the left on a computer and a bar at the bottom on a
 * phone. Its first three sections are the bar's, so they go in order of use.
 *
 * Do not add pages under /biz/<slug> that bypass this layout.
 */
export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ access }, locale] = await Promise.all([requireBusinessAccess(slug), getCurrentLocale()]);
  const { role, business } = access;
  const home = `/biz/${business.slug}`;
  const stamps = business.kind !== "supermarket";

  // Mirrors the permission each page checks; hiding a section is a convenience, never the protection.
  const items: BusinessNavItem[] = [
    { href: home, label: pick(locale, { es: "Inicio", en: "Home" }), icon: "home" },
    ...(roleCan(role, "visits:record") ? [{ href: `${home}/scan`, label: pick(locale, { es: "Escanear", en: "Scan" }), icon: "scan" as const }] : []),
    ...(!stamps && roleCan(role, "program:manage") ? [{ href: `${home}/rewards`, label: pick(locale, { es: "Premios", en: "Rewards" }), icon: "gift" as const }] : []),
    ...(stamps && roleCan(role, "customers:read") ? [{ href: `${home}/activity`, label: pick(locale, { es: "Actividad", en: "Activity" }), icon: "activity" as const }] : []),
    ...(stamps && roleCan(role, "program:manage")
      ? [
          { href: `${home}/program`, label: pick(locale, { es: "Programa de visitas", en: "Visit program" }), icon: "card" as const },
          { href: `${home}/qr`, label: pick(locale, { es: "QR de mesa", en: "Table QR" }), icon: "qr" as const },
        ]
      : []),
    ...(roleCan(role, "program:manage") ? [{ href: `${home}/design`, label: pick(locale, { es: "Diseño de la tarjeta", en: "Card design" }), icon: "palette" as const }] : []),
    ...(roleCan(role, "program:manage") ? [{ href: `${home}/receipts`, label: pick(locale, { es: "Recibos", en: "Receipts" }), icon: "receipt" as const }] : []),
    ...(roleCan(role, "members:manage") ? [{ href: `${home}/team`, label: pick(locale, { es: "Equipo", en: "Team" }), icon: "team" as const }] : []),
  ];
  const roleLabel =
    role === "owner"
      ? pick(locale, { es: "Propietario", en: "Owner" })
      : role === "staff"
        ? pick(locale, { es: "Personal", en: "Staff" })
        : pick(locale, { es: "Administrador de Cirix", en: "Cirix administrator" });

  return (
    <div className="flex min-h-dvh flex-1">
      <BusinessSidebar home={home} items={items} businessName={business.name} roleLabel={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface md:hidden print:hidden">
          <div className={`${CONTAINER_READ} flex flex-col py-3`}>
            <span className="truncate text-title font-bold text-text">{business.name}</span>
            <span className="text-label text-text-muted">{roleLabel}</span>
          </div>
        </header>
        {/* On the phone, room at the bottom so the menu bar never covers the last button. */}
        {/* Beside the menu on a computer, centered on a phone. */}
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col gap-5 px-4 py-6 pb-28 md:mx-0 md:max-w-4xl md:px-10 md:py-10 md:pb-10 print:mx-auto print:py-0">
          {children}
        </div>
      </div>
      <BusinessTabBar home={home} items={items} />
    </div>
  );
}
