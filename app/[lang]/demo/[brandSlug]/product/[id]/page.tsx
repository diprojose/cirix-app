import { ProductDetail } from "@/modules/loyalty/demo/storefront";
export default async function DemoProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProductDetail id={(await params).id} />;
}
