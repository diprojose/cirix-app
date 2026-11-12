import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignEditor } from "@/components/card-design/design-editor";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { makeGetCardDesign } from "@/modules/card-design/infrastructure/card-design-container";
import { makeGetStampProgram } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const metadata: Metadata = {
  title: "Card design",
  robots: { index: false, follow: false },
};

/** The owner dresses the loyalty card in their brand: colour, logo, cover photo and visit icon. */
export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { access } = await requireBusinessAccess(slug, "program:manage");
  const { business } = access;
  const restaurant = business.kind !== "supermarket";

  const [design, program] = await Promise.all([
    makeGetCardDesign().execute(business.id),
    restaurant ? makeGetStampProgram().execute(business.id) : Promise.resolve(null),
  ]);
  if (!design.ok) notFound();
  const sample =
    program?.ok === true
      ? { rewardName: program.value.rewardName, required: program.value.requiredStamps }
      : { rewardName: pick(locale, { es: "Tu premio", en: "Your reward" }), required: 8 };

  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-bold tracking-tight text-text">{pick(locale, { es: "Diseño de la tarjeta", en: "Card design" })}</h1>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "Ponle tu marca a la tarjeta que tus clientes llevan en el teléfono.",
            en: "Put your brand on the card your customers carry on their phone.",
          })}
        </p>
      </header>
      <DesignEditor
        slug={business.slug}
        businessId={business.id}
        businessName={business.name}
        kind={restaurant ? "restaurant" : "supermarket"}
        initial={design.value}
        sample={sample}
      />
    </main>
  );
}
