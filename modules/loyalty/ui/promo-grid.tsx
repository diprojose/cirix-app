import Image from "next/image";
import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER } from "./layout";

export function PromoGrid({ products }: { products: ProductDto[] }) {
  const productsWithImages = products.filter((product) => product.imageUrl);
  const first = productsWithImages[0];
  const second = productsWithImages[1] ?? productsWithImages[0];
  if (!first || !second) return null;

  return (
    <section className={`${CONTAINER} mt-7 grid gap-3 md:mt-12 md:grid-cols-2`} aria-label="Promociones">
      <PromoCard
        eyebrow="Beneficios cada semana"
        title="Compra más, gana más"
        copy="Acumula saldo en tus compras y úsalo en tu próximo pedido."
        product={first}
        className="bg-[#ffdfaa] text-[#123128]"
      />
      <PromoCard
        eyebrow="Selección del día"
        title="Frescura que se nota"
        copy="Productos elegidos para que tu compra llegue en su mejor momento."
        product={second}
        className="bg-[var(--brand-secondary)] text-[var(--brand-on-secondary)]"
      />
    </section>
  );
}

function PromoCard({
  eyebrow,
  title,
  copy,
  product,
  className,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  product: ProductDto;
  className: string;
}) {
  return (
    <article className={`relative isolate min-h-48 overflow-hidden rounded-3xl p-6 ${className}`}>
      <div className="relative z-10 max-w-[62%]">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.13em]">{eyebrow}</p>
        <h3 className="mt-2 font-heading text-2xl font-extrabold leading-tight tracking-tight">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed">{copy}</p>
        <LocalizedLink href="/loyalty#catalogo" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-action-fill px-4 text-xs font-bold text-on-action">
          Ver productos
        </LocalizedLink>
      </div>
      <div className="absolute -bottom-7 -right-3 h-44 w-44 rotate-[-8deg]">
        <Image src={product.imageUrl} alt="" fill sizes="176px" className="object-contain drop-shadow-xl" />
      </div>
    </article>
  );
}
