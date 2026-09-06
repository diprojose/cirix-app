import { redirect } from "next/navigation";
export default async function LoyaltyEntry({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/demo/mercado-fresco/home`);
}
