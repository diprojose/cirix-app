import type { CouponDto } from "@/modules/loyalty/coupons/application/dtos/coupon-dto";
import { saveCouponAction } from "@/app/admin/actions";

/** Shared input styling for the coupon fields (matches the product form). */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill";

/** Default value shown for the amount field, given the coupon's discount type. */
function defaultValue(coupon?: CouponDto): string {
  if (!coupon) return "";
  return coupon.discountType === "fixed"
    ? (coupon.value / 100).toFixed(2)
    : String(coupon.value);
}

/**
 * CouponForm is the operator's create/edit form, shared by both admin coupon
 * pages. A plain server-rendered form posting to the save action: the amount is
 * read as a percentage or as dollars depending on the discount type (converted
 * to the right units server-side), and the coupon is born inactive until the
 * operator ticks "activo". Category and segment targeting are not yet exposed
 * (they arrive with RFM in a later phase).
 */
export function CouponForm({ coupon }: { coupon?: CouponDto }) {
  return (
    <form action={saveCouponAction} className="space-y-4">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Código</span>
        <input
          type="text"
          name="code"
          required
          maxLength={24}
          defaultValue={coupon?.code ?? ""}
          placeholder="BIENVENIDA10"
          className={`${FIELD_CLASS} uppercase`}
        />
        <span className="block text-xs text-text-muted">
          3–24 caracteres: letras, números o guiones. Se guarda en mayúsculas.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Tipo de descuento</span>
          <select
            name="discountType"
            defaultValue={coupon?.discountType ?? "percentage"}
            className={FIELD_CLASS}
          >
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (US$)</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Valor</span>
          <input
            type="number"
            name="value"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={defaultValue(coupon)}
            placeholder="10"
            className={FIELD_CLASS}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-text-muted">
        Si el tipo es porcentaje, escribe 1–100. Si es monto fijo, escribe los dólares
        (ej. 5.00).
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Mínimo de compra (US$)</span>
          <input
            type="number"
            name="minSpend"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={coupon ? (coupon.minSpendCents / 100).toFixed(2) : ""}
            placeholder="0.00"
            className={FIELD_CLASS}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Usos por cliente</span>
          <input
            type="number"
            name="usageLimit"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={coupon?.usageLimitPerCustomer ?? ""}
            placeholder="Ilimitado"
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Segmento objetivo</span>
        <select
          name="segmentScope"
          defaultValue={coupon?.segmentScope ?? ""}
          className={FIELD_CLASS}
        >
          <option value="">Todos los clientes</option>
          <option value="nuevo">Nuevos</option>
          <option value="activo">Activos</option>
          <option value="vip">VIP</option>
          <option value="en_riesgo">En riesgo</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Expira (opcional)</span>
        <input
          type="date"
          name="expiresAt"
          defaultValue={coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : ""}
          className={FIELD_CLASS}
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-text">
        <input
          type="checkbox"
          name="active"
          defaultChecked={coupon?.active ?? false}
          className="h-5 w-5 accent-action-fill"
        />
        Activo (publicado)
      </label>

      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-action-fill to-action-strong text-sm font-semibold text-on-action shadow-action transition-transform active:scale-[0.98]"
      >
        {coupon ? "Guardar cambios" : "Crear cupón"}
      </button>
    </form>
  );
}
