import { makeListAvailableProducts } from "@/modules/catalog/infrastructure/di/catalog-container";
import { formatPrice } from "@/lib/format/money";

// Driving (primary) adapter: this Server Component executes the catalog use
// case on the server and renders the resulting DTOs. The UI depends only on
// DTOs and the Result shape — never on domain entities or infrastructure.
export default async function MenuPage() {
  const result = await makeListAvailableProducts().execute();

  if (!result.ok) {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <p className="text-red-600">No se pudo cargar el menú.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Menú</h1>
      <ul className="flex flex-col gap-3">
        {result.value.map((product) => (
          <li
            key={product.id}
            className="flex items-baseline justify-between gap-4 border-b border-black/[.08] pb-3 dark:border-white/[.145]"
          >
            <span>{product.name}</span>
            <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
              {formatPrice(product.priceCents, product.currency)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
