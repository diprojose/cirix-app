import LoginPage from "@/app/(auth)/login/page";

export default async function BrandedLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; brandSlug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ lang, brandSlug }, query] = await Promise.all([params, searchParams]);
  const brandedRoot = `/${lang}/demo/${brandSlug}`;
  const brandedHome = `${brandedRoot}/home`;
  const from =
    query.from === brandedRoot || query.from?.startsWith(`${brandedRoot}/`)
      ? query.from
      : brandedHome;

  return <LoginPage searchParams={Promise.resolve({ from })} />;
}
