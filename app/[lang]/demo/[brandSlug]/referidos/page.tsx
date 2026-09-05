import ReferralsPage, {
  metadata,
} from "@/modules/loyalty/server/referrals-page";

export { metadata };

export default async function BrandedReferralsPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  return <ReferralsPage basePath={`/demo/${brandSlug}`} />;
}
