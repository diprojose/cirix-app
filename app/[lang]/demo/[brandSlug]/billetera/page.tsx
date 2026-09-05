import WalletPage from "@/modules/loyalty/server/wallet-page";

export default async function BrandedWalletPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  return <WalletPage basePath={`/demo/${brandSlug}`} />;
}
