import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { DEPARTMENT_ORDER, departmentLabel } from "@/components/store/departments";
import { saveProductAction } from "@/app/admin/actions";

/** Shared input styling for the product fields. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

/**
 * ProductForm is the operator's create/edit form, shared by both admin pages.
 * A plain server-rendered form posting to the save action: prices are typed in
 * dollars (converted to cents server-side) and the image is a URL — either a
 * bundled `/products/...` file or an external https image.
 */
export function ProductForm({ product }: { product?: ProductDto }) {
  return (
    <form action={saveProductAction} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Nombre</span>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          defaultValue={product?.name ?? ""}
          placeholder="Torta de chocolate"
          className={FIELD_CLASS}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Descripción</span>
        <textarea
          name="description"
          required
          rows={3}
          maxLength={300}
          defaultValue={product?.description ?? ""}
          placeholder="Bizcocho húmedo de chocolate…"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Precio (US$)</span>
          <input
            type="number"
            name="price"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
            placeholder="25.00"
            className={FIELD_CLASS}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Costo (US$)</span>
          <input
            type="number"
            name="cost"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={product ? (product.costCents / 100).toFixed(2) : ""}
            placeholder="12.00"
            className={FIELD_CLASS}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-text-muted">
        El costo es interno (no se muestra al cliente); define el margen sobre el que se
        calculan las recompensas.
      </p>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Departamento</span>
        <select
          name="department"
          required
          defaultValue={product?.department ?? DEPARTMENT_ORDER[0]}
          className={FIELD_CLASS}
        >
          {DEPARTMENT_ORDER.map((department) => (
            <option key={department} value={department}>
              {departmentLabel(department)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">URL de imagen (opcional)</span>
        <input
          type="text"
          name="imageUrl"
          defaultValue={product?.imageUrl ?? ""}
          placeholder="/products/torta-de-chocolate.png"
          className={FIELD_CLASS}
        />
        <span className="block text-xs text-text-muted">
          Ruta local (/products/…) o URL https de una imagen.
        </span>
      </label>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-text">
          <input
            type="checkbox"
            name="available"
            defaultChecked={product?.available ?? true}
            className="h-5 w-5 accent-[oklch(0.64_0.17_288)]"
          />
          Visible en la tienda
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-text">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={product?.featured ?? false}
            className="h-5 w-5 accent-[oklch(0.64_0.17_288)]"
          />
          Destacado
        </label>
      </div>

      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
      >
        {product ? "Guardar cambios" : "Crear producto"}
      </button>
    </form>
  );
}
