import type { Metadata } from "next";
import { Account } from "@/modules/loyalty/demo/account";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BrandedOrderPage({
  params,
}: {
  params: Promise<{ brandSlug: string; id: string }>;
}) {
  const resolved = await params;
  return <Account id={resolved.id} />;
}
