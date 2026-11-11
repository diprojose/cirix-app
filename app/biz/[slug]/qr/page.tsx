import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { TableQrPoster } from "@/components/stamps/table-qr-poster";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetStampProgram, makeGetTableCode } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const metadata: Metadata = {
  title: "Table QR",
  robots: { index: false, follow: false },
};

/** The owner prints the table QR here: signup for newcomers and, when turned on, the visit's stamp. */
export default async function TableQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { access } = await requireBusinessAccess(slug, "program:manage");
  if (access.business.kind === "supermarket") notFound();

  const [program, code] = await Promise.all([
    makeGetStampProgram().execute(access.business.id),
    makeGetTableCode().execute(access.business.id),
  ]);
  if (!program.ok || !code.ok) notFound();

  return (
    <main className="flex flex-col gap-5 md:max-w-md">
      <header className="flex flex-col gap-1 print:hidden">
        <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "QR de mesa", en: "Table QR" })}</h1>
        <p className="text-label text-text-muted">
          {program.value.tableStamps
            ? pick(locale, {
                es: "Imprímelo y ponlo en cada mesa. Quien lo escanea se registra la primera vez y, después, registra cada visita.",
                en: "Print it and place it on every table. Scanning it signs people up the first time and records each visit after that.",
              })
            : pick(locale, {
                es: "Imprímelo y ponlo en cada mesa para que los clientes se registren. Hoy las visitas las registra el personal; puedes activar que el cliente registre su visita con este QR en el programa de visitas.",
                en: "Print it and place it on every table so customers can sign up. Right now staff record visits; you can let customers record their visit with this QR in the visit program.",
              })}
        </p>
        {!program.value.tableStamps && (
          <LocalizedLink href={`/biz/${access.business.slug}/program`} className="text-label text-accent underline underline-offset-4">
            {pick(locale, { es: "Ir al programa de visitas", en: "Go to the visit program" })}
          </LocalizedLink>
        )}
      </header>
      <TableQrPoster
        slug={access.business.slug}
        businessName={access.business.name}
        initialCode={code.value.code}
        tableStamps={program.value.tableStamps}
      />
    </main>
  );
}
