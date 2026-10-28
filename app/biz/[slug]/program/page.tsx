import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramForm } from "@/components/stamps/program-form";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetStampProgram } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const metadata: Metadata = {
  title: "Stamp program",
  robots: { index: false, follow: false },
};

/** The owner's rules for the stamp card: how many stamps, the reward, the wait between stamps. */
export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { access } = await requireBusinessAccess(slug, "program:manage");
  if (access.business.kind === "supermarket") notFound();

  const program = await makeGetStampProgram().execute(access.business.id);
  if (!program.ok) notFound();

  return (
    <main className="flex flex-col gap-5 md:max-w-md">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-bold tracking-tight text-text">
          {pick(locale, { es: "Programa de sellos", en: "Stamp program" })}
        </h1>
        <p className="text-label text-text-muted">
          {pick(locale, {
            es: "Los cambios aplican a los próximos sellos. Las tarjetas en curso conservan lo que ya juntaron.",
            en: "Changes apply to future stamps. Cards in progress keep what they already collected.",
          })}
        </p>
      </header>
      <ProgramForm slug={access.business.slug} initial={program.value} />
    </main>
  );
}
