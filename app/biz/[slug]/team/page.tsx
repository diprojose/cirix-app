import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { TeamManager } from "@/components/team/team-manager";
import { COLUMN } from "@/components/store/layout";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { manageableRoles } from "@/core/tenancy/domain/value-objects/member-role";
import { makeListTeam } from "@/core/tenancy/infrastructure/di/tenancy-container";

export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false },
};

/** The owner adds and removes staff here instead of asking Cirix to run a script. */
export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { viewer, access } = await requireBusinessAccess(slug, "members:manage");
  const team = await makeListTeam().execute(access.business.id);
  if (!team.ok) notFound();

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-5 py-8 md:max-w-xl`}>
      <header className="flex flex-col gap-1">
        <LocalizedLink href={`/biz/${access.business.slug}`} className="text-label text-accent underline underline-offset-4">
          {pick(locale, { es: "← Volver", en: "← Back" })}
        </LocalizedLink>
        <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Equipo", en: "Team" })}</h1>
        <p className="text-label text-text-muted">
          {pick(locale, {
            es: "Las personas que pueden sellar tarjetas en tu negocio. Si alguien deja de trabajar contigo, quítalo y pierde el acceso al momento.",
            en: "The people who can stamp cards at your business. When someone stops working with you, remove them and they lose access at once.",
          })}
        </p>
      </header>
      <TeamManager
        slug={access.business.slug}
        team={team.value}
        viewerId={viewer.uid ?? ""}
        manageable={manageableRoles(access.role)}
      />
    </main>
  );
}
