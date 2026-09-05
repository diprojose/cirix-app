import Image from "next/image";
import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { CONTAINER, BLEED } from "./layout";

const CARD_COLORS = ["#eef7df", "#fff0df", "#f4eafa", "#e8f5f4", "#fff0f2"];

export function CategoryShowcase({ products }: { products: ProductDto[] }) {
  const entries = [
    { label: "Vegetales", product: products.find((item) => item.name.includes("Brócoli")) },
    { label: "Frutas", product: products.find((item) => item.name.includes("Aguacate")) },
    { label: "Para cocinar", product: products.find((item) => item.name.includes("Tomate")) },
    { label: "Crujientes", product: products.find((item) => item.name.includes("Zanahoria")) },
    { label: "Favoritos", product: products.find((item) => item.featured) },
  ].filter((entry) => entry.product?.imageUrl);

  return (
    <section className={`${CONTAINER} mt-8 md:mt-12`} aria-labelledby="category-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="category-title" className="font-heading text-xl font-bold tracking-tight text-text md:text-3xl">
          Compra por categoría
        </h2>
        <a href="#catalogo" className="text-label font-semibold text-accent hover:underline">
          Ver todo
        </a>
      </div>
      <div className={`${BLEED} mt-4 flex gap-3 overflow-x-auto pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0`}>
        {entries.map(({ label, product }, index) => (
          <a
            key={`${label}-${product!.id}`}
            href="#catalogo"
            className="group w-28 shrink-0 rounded-2xl border border-transparent p-2 text-center transition-colors hover:border-accent/30 md:w-auto"
          >
            <span
              className="relative block aspect-square overflow-hidden rounded-2xl"
              style={{ backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }}
            >
              <Image
                src={product!.imageUrl}
                alt=""
                fill
                sizes="128px"
                className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="mt-2 block text-label font-semibold text-text">{label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
