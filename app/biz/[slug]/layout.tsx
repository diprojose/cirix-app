import type { ReactNode } from "react";
import { BusinessNav, type BusinessNavItem } from "@/components/biz/business-nav";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER_READ } from "@/components/store/layout";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { roleCan } from "@/core/tenancy/domain/value-objects/member-role";

/**
 * The membership gate for EVERY page under /biz/<slug>, and the panel's frame:
 * the business name and the section menu stay in place while pages change. The
 * proxy lets any verified account reach this area, so this layout is what keeps
 * outsiders out: without a role in this business they get a 404. Pages below
 * still check the specific permission they need (for example `customers:read`).
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

  // Mirrors the permission each page checks; hiding a tab is a convenience, never the protection.
  const items: BusinessNavItem[] = [
    { href: home, label: pick(locale, { es: "Inicio", en: "Home" }) },
    ...(stamps && roleCan(role, "visits:record") ? [{ href: `${home}/scan`, label: pick(locale, { es: "Escanear", en: "Scan" }) }] : []),
    ...(stamps && roleCan(role, "customers:read") ? [{ href: `${home}/activity`, label: pick(locale, { es: "Actividad", en: "Activity" }) }] : []),
    ...(stamps && roleCan(role, "program:manage")
      ? [
          { href: `${home}/program`, label: pick(locale, { es: "Programa de sellos", en: "Stamp program" }) },
          { href: `${home}/qr`, label: pick(locale, { es: "QR de mesa", en: "Table QR" }) },
        ]
      : []),
    ...(roleCan(role, "program:manage") ? [{ href: `${home}/receipts`, label: pick(locale, { es: "Recibos", en: "Receipts" }) }] : []),
    ...(roleCan(role, "members:manage") ? [{ href: `${home}/team`, label: pick(locale, { es: "Equipo", en: "Team" }) }] : []),
  ];

  return (
    <div className={`${CONTAINER_READ} flex min-h-dvh flex-1 flex-col gap-5 py-6 print:py-0`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 print:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-title font-bold tracking-tight text-text">{business.name}</span>
          <span className="text-caption text-text-muted">
            {role === "owner"
              ? pick(locale, { es: "Propietario", en: "Owner" })
              : role === "staff"
                ? pick(locale, { es: "Personal", en: "Staff" })
                : pick(locale, { es: "Administrador de Cirix", en: "Cirix administrator" })}
          </span>
        </div>
        <LocalizedLink href="/me" className="text-label text-accent underline underline-offset-4">
          {pick(locale, { es: "Mi cuenta", en: "My account" })}
        </LocalizedLink>
      </header>
      <BusinessNav home={home} items={items} />
      {children}
    </div>
  );
}
