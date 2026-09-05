import Image from "next/image";
import type { BrandProfile } from "@/modules/loyalty/branding/application/brand-profile";
import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER } from "./layout";

export function StorefrontHero({
  brand,
  products,
}: {
  brand: BrandProfile;
  products: ProductDto[];
}) {
  const produce = products.filter((product) => product.imageUrl).slice(0, 5);

  return (
    <section className={`${CONTAINER} mt-5 md:mt-8`}>
      <div
        className="relative isolate overflow-hidden rounded-[1.75rem] px-5 py-7 text-on-accent shadow-card md:min-h-[27rem] md:px-12 md:py-12"
        style={{
          background:
            "linear-gradient(125deg, var(--color-accent-fill), var(--color-accent-fill-strong))",
        }}
      >
        <div className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 opacity-15 md:block [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative z-10 max-w-xl md:pt-3">
          <p className="inline-flex rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
            Compra · acumula · disfruta
          </p>
          <h1 className="mt-5 max-w-[12ch] font-heading text-[2.3rem] font-extrabold leading-[0.98] tracking-[-0.045em] md:text-6xl">
            {brand.heroTitle}
          </h1>
          <p className="mt-4 max-w-[44ch] text-sm leading-relaxed md:text-lg">
            {brand.heroSubtitle}
          </p>
          <LocalizedLink
            href="/loyalty#catalogo"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-action-fill px-6 text-sm font-bold text-on-action shadow-action transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            Comprar ahora <span aria-hidden="true" className="ml-2">→</span>
          </LocalizedLink>
        </div>

        <div className="pointer-events-none relative mx-auto mt-5 h-36 max-w-sm md:absolute md:inset-y-0 md:right-8 md:mt-0 md:h-auto md:w-[44%] md:max-w-none">
          <div className="absolute bottom-2 left-1/2 h-16 w-[86%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-xl" />
          {produce.map((product, index) => {
            const positions = [
              "left-[4%] bottom-[5%] -rotate-6",
              "left-[25%] bottom-[18%] rotate-6",
              "left-[47%] bottom-[2%] -rotate-3",
              "right-[4%] bottom-[20%] rotate-12",
              "right-[25%] top-[4%] rotate-3",
            ];
            return (
              <div
                key={product.id}
                className={`absolute aspect-square w-[30%] drop-shadow-[0_18px_18px_rgba(0,0,0,0.28)] md:w-[36%] ${positions[index]}`}
              >
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 120px, 240px"
                  className="object-contain"
                  priority={index < 2}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
