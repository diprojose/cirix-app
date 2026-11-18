import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-businesses/admin-shell";
import { CreateBusinessForm } from "@/components/admin-businesses/create-business-form";
import { requireCirixAdmin } from "@/lib/auth/cirix-admin";
import { getCurrentLocale, pick } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "New business",
  robots: { index: false, follow: false },
};

/** A Cirix administrator opens a business and names its owner. */
export default async function NewBusinessPage() {
  await requireCirixAdmin();
  const locale = await getCurrentLocale();

  return (
    <AdminShell locale={locale} back>
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Crear negocio", en: "New business" })}</h1>
        <p className="max-w-xl text-label text-text-muted">
          {pick(locale, {
            es: "El dueño entra con su correo (Google o enlace) y ya ve su negocio. Después, desde su panel, diseña la tarjeta, arma el programa y agrega a su personal.",
            en: "The owner signs in with their email (Google or a link) and already sees their business. From their panel they then design the card, set up the program and add their staff.",
          })}
        </p>
      </header>
      <CreateBusinessForm />
    </AdminShell>
  );
}
