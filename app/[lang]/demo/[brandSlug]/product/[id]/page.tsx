import {
  default as ProductDetailPage,
  generateMetadata as generateProductMetadata,
} from "@/app/product/[id]/page";

type DemoProductProps = {
  params: Promise<{ brandSlug: string; id: string }>;
};

function productParams(params: DemoProductProps["params"]) {
  return params.then(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: DemoProductProps) {
  return generateProductMetadata({ params: productParams(params) });
}

export default function BrandedProductPage({ params }: DemoProductProps) {
  return <ProductDetailPage params={productParams(params)} />;
}
