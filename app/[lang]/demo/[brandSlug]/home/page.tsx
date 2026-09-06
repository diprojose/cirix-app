import { Suspense } from "react";
import { Storefront } from "@/modules/loyalty/demo/storefront";

export default function DemoHomePage() {
  return (
    <Suspense>
      <Storefront />
    </Suspense>
  );
}
