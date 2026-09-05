import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireOperator } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import { makeListAllProducts } from "@/modules/loyalty/catalog/infrastructure/di/catalog-container";
import { departmentLabel } from "@/components/store/departments";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { deleteProductAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Productos" };

/**
 * Operator catalog view: every product — hidden ones included — with edit
 * links, availability at a glance and a delete escape hatch (hiding via
 * "available" is the recommended path for seasonal items).
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { error } = await searchParams;

  const result = await makeListAllProducts().execute();
  const products = result.ok ? result.value : [];

  return (
    <div>
      <FeedbackBanner error={error} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">Productos ({products.length})</h1>
        <Link
          href="/admin/products/new"
          className="rounded-pill bg-gradient-to-r from-action-fill to-action-fill-strong px-4 py-2 text-sm font-semibold text-on-action shadow-action transition-transform active:scale-95"
        >
          + Nuevo
        </Link>
      </div>

      <ul className="space-y-2">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-xs"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-xl" aria-hidden="true">
                  🧁
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">
                {product.name}
                {product.featured && (
                  <span className="ml-2 rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
                    Destacado
                  </span>
                )}
              </p>
              <p className="text-xs text-text-muted">
                {departmentLabel(product.department)} ·{" "}
                {formatPrice(product.priceCents, product.currency)}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                product.available
                  ? "bg-action-fill/15 text-action-strong"
                  : "bg-stone-200 text-text-muted"
              }`}
            >
              {product.available ? "Visible" : "Oculto"}
            </span>

            <Link
              href={`/admin/products/${product.id}`}
              className="shrink-0 rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-stone-100"
            >
              Editar
            </Link>
            <form action={deleteProductAction.bind(null, product.id)}>
              <button
                type="submit"
                aria-label={`Eliminar ${product.name}`}
                className="shrink-0 rounded-pill border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-transform active:scale-95"
              >
                Eliminar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
