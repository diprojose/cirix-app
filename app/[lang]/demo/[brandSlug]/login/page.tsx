import { redirect } from "next/navigation";

export default async function BrandedLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; brandSlug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ lang, brandSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const brandedRoot = `/${lang}/demo/${brandSlug}`;
  const brandedHome = `${brandedRoot}/home`;
  const from =
    (query.from === brandedRoot || query.from?.startsWith(`${brandedRoot}/`)) &&
    !query.from?.startsWith(`${brandedRoot}/login`)
      ? query.from
      : brandedHome;

  redirect(from!);
}
