"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemo } from "./provider";
import { couponSchema, productSchema, wallet } from "./model";
import { OrderDetail, OrdersTable } from "./account";
import { Appearance } from "./appearance";
import { Shell, Heading, Empty, s } from "./ui";

export function Admin({ section = [] }: { section?: string[] }) {
  const { state, basePath, reset, t, money } = useDemo();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const tab = section[0] ?? "overview";
  const nav = [
    ["overview", "Resumen", "Overview"],
    ["products", "Productos", "Products"],
    ["orders", "Pedidos", "Orders"],
    ["coupons", "Cupones", "Coupons"],
    ["rewards", "Recompensas", "Rewards"],
    ["settings", "Apariencia", "Appearance"],
  ];
  const title = nav.find((n) => n[0] === tab);
  return (
    <Shell admin>
      <div className={s.adminLayout}>
        <nav
          className={s.adminSidebar}
          aria-label={t("Administración demo", "Demo administration")}
        >
          <p>{t("TU NEGOCIO", "YOUR BUSINESS")}</p>
          {nav.map(([id, es, en]) => (
            <Link
              key={id}
              href={`${basePath}/admin${id === "overview" ? "" : `/${id}`}`}
              aria-current={tab === id ? "page" : undefined}
            >
              {t(es, en)}
            </Link>
          ))}
          <Link href={`${basePath}/home`}>
            ↗ {t("Ver tienda", "View store")}
          </Link>
          <button
            className={s.dangerButton}
            onClick={() => setConfirmReset(true)}
          >
            {t("Restablecer demo", "Reset demo")}
          </button>
        </nav>
        <div className={s.adminContent}>
          <Heading
            eyebrow={t(
              "ADMINISTRADOR DEMO · ACCESO LIBRE",
              "DEMO ADMIN · OPEN ACCESS",
            )}
            title={
              title
                ? t(title[1], title[2])
                : t("Sección no encontrada", "Section not found")
            }
          />
          {confirmReset && (
            <section
              className={s.panel}
              role="region"
              aria-label={t("Confirmar restablecimiento", "Confirm reset")}
            >
              <h2>
                {t("¿Volver al demo inicial?", "Restore the original demo?")}
              </h2>
              <p>
                {t(
                  "Se eliminarán los productos editados, pedidos y cambios de marca de este demo en tu navegador.",
                  "Edited products, orders and brand changes for this demo will be removed from your browser.",
                )}
              </p>
              <div className={s.actions}>
                <button
                  className={s.dangerButton}
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setResetCount((n) => n + 1);
                  }}
                >
                  {t("Sí, restablecer", "Yes, reset")}
                </button>
                <button
                  className={s.secondary}
                  onClick={() => setConfirmReset(false)}
                >
                  {t("Conservar mis cambios", "Keep my changes")}
                </button>
              </div>
            </section>
          )}
          <div key={`${section.join("/")}:${resetCount}`}>
            {tab === "overview" ? (
              <>
                <div className={s.metrics}>
                  <div className={s.metric}>
                    <span>{t("Ventas del demo", "Demo sales")}</span>
                    <strong>
                      {money(
                        state.orders
                          .filter(
                            (o) =>
                              ![
                                "received",
                                "payment_reported",
                                "cancelled",
                              ].includes(o.status),
                          )
                          .reduce((sum, o) => sum + o.totalCents, 0),
                      )}
                    </strong>
                  </div>
                  <div className={s.metric}>
                    <span>{t("Pedidos recibidos", "Orders placed")}</span>
                    <strong>{state.orders.length}</strong>
                  </div>
                  <div className={s.metric}>
                    <span>{t("Productos activos", "Active products")}</span>
                    <strong>
                      {state.products.filter((p) => p.available).length}
                    </strong>
                  </div>
                </div>
                <section className={s.panel}>
                  <h2>
                    {t(
                      "Prepara tu mercado en minutos",
                      "Make this market yours in minutes",
                    )}
                  </h2>
                  <p className={s.muted}>
                    {t(
                      "Cambia la marca, ajusta el catálogo y haz una compra para recorrer todo el demo. No necesitas una cuenta.",
                      "Change the brand, adjust your catalog and place an order to explore the whole demo. No account needed.",
                    )}
                  </p>
                  <div className={s.actions}>
                    <Link
                      className={s.primary}
                      href={`${basePath}/admin/settings`}
                    >
                      {t("1. Personalizar marca", "1. Customize brand")}
                    </Link>
                    <Link
                      className={s.secondary}
                      href={`${basePath}/admin/products`}
                    >
                      {t("2. Revisar productos", "2. Review products")}
                    </Link>
                    <Link className={s.secondary} href={`${basePath}/home`}>
                      {t("3. Probar una compra", "3. Try a purchase")}
                    </Link>
                  </div>
                </section>
                <section className={s.panel}>
                  <h2>{t("Últimos pedidos", "Recent orders")}</h2>
                  <OrdersTable admin />
                </section>
              </>
            ) : tab === "settings" ? (
              <Appearance />
            ) : tab === "products" ? (
              section[1] ? (
                <ProductEditor id={section[1]} />
              ) : (
                <Products />
              )
            ) : tab === "orders" ? (
              section[1] ? (
                <OrderDetail admin id={section[1]} />
              ) : (
                <section className={s.panel}>
                  <OrdersTable admin />
                </section>
              )
            ) : tab === "coupons" ? (
              <Coupons />
            ) : tab === "rewards" ? (
              <Rewards />
            ) : (
              <Empty
                title={t(
                  "Esta sección no existe",
                  "This section does not exist",
                )}
                detail={t(
                  "Usa el menú para explorar el administrador.",
                  "Use the menu to explore the admin.",
                )}
              />
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Products() {
  const { state, basePath, t, money } = useDemo();
  return (
    <section className={s.panel}>
      <div className={s.sectionHeading}>
        <h2>{t("Catálogo de productos", "Product catalog")}</h2>
        <Link className={s.primary} href={`${basePath}/admin/products/new`}>
          + {t("Nuevo producto", "New product")}
        </Link>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>{t("Producto", "Product")}</th>
              <th>{t("Presentación", "Unit")}</th>
              <th>{t("Precio", "Price")}</th>
              <th>{t("Disponibilidad", "Availability")}</th>
              <th>{t("Acciones", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.unit}</td>
                <td>{money(p.priceCents)}</td>
                <td>
                  {p.available
                    ? t("Disponible", "Available")
                    : t("Agotado", "Unavailable")}
                </td>
                <td>
                  <Link href={`${basePath}/admin/products/${p.id}`}>
                    {t("Editar", "Edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function ProductEditor({ id }: { id: string }) {
  const { state, basePath, dispatch, t } = useDemo();
  const router = useRouter();
  const existing = state.products.find((p) => p.id === id);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (id !== "new" && !existing)
    return (
      <Empty
        title={t("Producto no encontrado", "Product not found")}
        detail={t(
          "El producto pudo ser eliminado.",
          "This product may have been removed.",
        )}
      />
    );
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product = productSchema.safeParse({
      id: existing?.id ?? crypto.randomUUID(),
      name: form.get("name"),
      description: form.get("description"),
      unit: form.get("unit"),
      category: form.get("category"),
      priceCents: Math.round(Number(form.get("price")) * 100),
      costCents: Math.round(Number(form.get("cost")) * 100),
      previousPriceCents: form.get("previous")
        ? Math.round(Number(form.get("previous")) * 100)
        : undefined,
      imageUrl: form.get("image"),
      available: form.get("available") === "on",
      featured: form.get("featured") === "on",
    });
    if (!product.success) {
      setError(
        t(
          "Revisa los campos. La imagen debe ser una ruta local o URL HTTPS.",
          "Check the fields. Images must use a local path or HTTPS URL.",
        ),
      );
      return;
    }
    const failure = dispatch({ type: "product", product: product.data });
    if (failure) setError(failure);
    else router.push(`${basePath}/admin/products`);
  }
  return (
    <form className={`${s.panel} ${s.form}`} onSubmit={save}>
      <h2>
        {existing
          ? t("Editar producto", "Edit product")
          : t("Nuevo producto", "New product")}
      </h2>
      <label>
        {t("Nombre", "Name")}
        <input
          name="name"
          defaultValue={existing?.name}
          required
          maxLength={180}
        />
      </label>
      <div className={s.formGrid}>
        <label>
          {t("Presentación", "Unit")}
          <input
            name="unit"
            defaultValue={existing?.unit ?? "1 kg"}
            required
            maxLength={180}
          />
        </label>
        <label>
          {t("Categoría", "Category")}
          <select
            name="category"
            defaultValue={existing?.category ?? "vegetables"}
          >
            <option value="vegetables">{t("Verduras", "Vegetables")}</option>
            <option value="fruit">{t("Frutas", "Fruit")}</option>
            <option value="bundles">{t("Packs", "Packs")}</option>
          </select>
        </label>
        <label>
          {t("Precio (USD)", "Price (USD)")}
          <input
            name="price"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={existing ? existing.priceCents / 100 : ""}
          />
        </label>
        <label>
          {t("Costo (USD)", "Cost (USD)")}
          <input
            name="cost"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={existing ? existing.costCents / 100 : 0}
          />
        </label>
      </div>
      <label>
        {t("Precio anterior (opcional)", "Previous price (optional)")}
        <input
          name="previous"
          type="number"
          min="0"
          max="1000000"
          step="0.01"
          defaultValue={
            existing?.previousPriceCents
              ? existing.previousPriceCents / 100
              : ""
          }
        />
      </label>
      <label>
        {t("Descripción", "Description")}
        <textarea
          name="description"
          defaultValue={existing?.description ?? ""}
          maxLength={1000}
        />
      </label>
      <label>
        {t("Imagen (ruta o URL HTTPS)", "Image (path or HTTPS URL)")}
        <input
          name="image"
          defaultValue={existing?.imageUrl ?? ""}
          placeholder="/products/tomates.png"
        />
      </label>
      <label className={s.radio}>
        <input
          type="checkbox"
          name="available"
          defaultChecked={existing?.available ?? true}
        />
        {t("Disponible para comprar", "Available for purchase")}
      </label>
      <label className={s.radio}>
        <input
          type="checkbox"
          name="featured"
          defaultChecked={existing?.featured ?? false}
        />
        {t("Producto destacado", "Featured product")}
      </label>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.actions}>
        <button className={s.primary}>
          {t("Guardar producto", "Save product")}
        </button>
        <Link className={s.secondary} href={`${basePath}/admin/products`}>
          {t("Volver", "Back")}
        </Link>
        {existing && (
          <button
            type="button"
            className={s.dangerButton}
            onClick={() => setConfirmDelete(true)}
          >
            {t("Eliminar", "Delete")}
          </button>
        )}
      </div>
      {confirmDelete && existing && (
        <div className={s.infoBox}>
          <p>
            {t(
              "¿Eliminar este producto del catálogo y del carrito? Los pedidos anteriores se conservarán.",
              "Remove this product from the catalog and cart? Existing orders will be kept.",
            )}
          </p>
          <button
            type="button"
            className={s.dangerButton}
            onClick={() => {
              const failure = dispatch({ type: "deleteProduct", id });
              if (failure) setError(failure);
              else router.push(`${basePath}/admin/products`);
            }}
          >
            {t("Confirmar eliminación", "Confirm deletion")}
          </button>
          <button
            type="button"
            className={s.secondary}
            onClick={() => setConfirmDelete(false)}
          >
            {t("Cancelar", "Cancel")}
          </button>
        </div>
      )}
    </form>
  );
}

function Coupons() {
  const { state, dispatch, t, money } = useDemo();
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const coupon = state.coupons.find((c) => c.code === editing);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = couponSchema.safeParse({
      code: String(form.get("code")).trim().toUpperCase(),
      percent: Number(form.get("percent")),
      minSpendCents: Math.round(Number(form.get("minimum")) * 100),
      active: form.get("active") === "on",
    });
    if (!parsed.success) {
      setError(
        t(
          "Revisa el código, porcentaje y compra mínima.",
          "Check the code, percentage and minimum spend.",
        ),
      );
      return;
    }
    const failure = dispatch({ type: "coupon", coupon: parsed.data });
    if (failure) setError(failure);
    else {
      setError("");
      setMessage(t("Cupón guardado.", "Coupon saved."));
    }
  }
  return (
    <>
      <section className={s.panel}>
        <h2>{t("Cupones de tu mercado", "Market coupons")}</h2>
        {state.coupons.map((c) => (
          <div className={s.sectionHeading} key={c.code}>
            <div>
              <b>{c.code}</b>
              <p className={s.muted}>
                {c.percent}% · {t("Desde", "From")} {money(c.minSpendCents)} ·{" "}
                {c.active ? t("Activo", "Active") : t("Inactivo", "Inactive")}
              </p>
            </div>
            <button
              className={s.secondary}
              onClick={() => {
                setEditing(c.code);
                setMessage("");
                setError("");
              }}
            >
              {t("Editar", "Edit")}
            </button>
          </div>
        ))}
        <button className={s.secondary} onClick={() => setEditing(null)}>
          + {t("Nuevo cupón", "New coupon")}
        </button>
      </section>
      <form
        key={editing ?? "new"}
        className={`${s.panel} ${s.form}`}
        onSubmit={save}
      >
        <h2>
          {coupon
            ? t("Editar cupón", "Edit coupon")
            : t("Nuevo cupón", "New coupon")}
        </h2>
        <label>
          {t("Código", "Code")}
          <input
            name="code"
            defaultValue={coupon?.code}
            readOnly={!!coupon}
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9-]{3,24}"
          />
        </label>
        <div className={s.formGrid}>
          <label>
            {t("Descuento (%)", "Discount (%)")}
            <input
              name="percent"
              type="number"
              min="1"
              max="100"
              step="1"
              required
              defaultValue={coupon?.percent ?? 10}
            />
          </label>
          <label>
            {t("Compra mínima (USD)", "Minimum spend (USD)")}
            <input
              name="minimum"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={(coupon?.minSpendCents ?? 0) / 100}
            />
          </label>
        </div>
        <label className={s.radio}>
          <input
            name="active"
            type="checkbox"
            defaultChecked={coupon?.active ?? true}
          />
          {t("Cupón activo", "Active coupon")}
        </label>
        <p className={s.muted}>
          {t(
            "Un cupón por pedido y un uso por cliente demo. Desactívalo para retirarlo de futuras compras.",
            "One coupon per order and one use per demo customer. Deactivate it to remove it from future purchases.",
          )}
        </p>
        <button className={s.primary}>
          {t("Guardar cupón", "Save coupon")}
        </button>
        {message && (
          <p className={s.success} role="status">
            {message}
          </p>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}

function Rewards() {
  const { state, dispatch, t, money } = useDemo();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const balance = wallet(state);
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rules = {
      earnRatePctOfMargin: Number(data.get("earn")),
      holdbackDays: Number(data.get("hold")),
      expiryDays: Number(data.get("expiry")),
      maxRedeemPctOfOrder: Number(data.get("max")),
    };
    const failure = dispatch({ type: "rules", rules });
    if (failure) setError(failure);
    else {
      setError("");
      setMessage(
        t(
          "Reglas guardadas para futuras compras.",
          "Rules saved for future purchases.",
        ),
      );
    }
  }
  return (
    <>
      <div className={s.metrics}>
        <div className={s.metric}>
          <span>{t("Disponible", "Available")}</span>
          <strong>{money(balance.available)}</strong>
        </div>
        <div className={s.metric}>
          <span>{t("Pendiente", "Pending")}</span>
          <strong>{money(balance.pending)}</strong>
        </div>
        <div className={s.metric}>
          <span>{t("Días simulados", "Simulated days")}</span>
          <strong>+{state.clockOffsetDays}</strong>
        </div>
      </div>
      <section className={s.panel}>
        <h2>
          {t("Prueba la liberación del saldo", "Try releasing reward credit")}
        </h2>
        <p className={s.muted}>
          {t(
            "Confirma un pedido y avanza el reloj del demo para ver cuándo se libera o vence su recompensa.",
            "Confirm an order and advance the demo clock to see when its reward becomes available or expires.",
          )}
        </p>
        <div className={s.actions}>
          {[1, 7, 90].map((days) => (
            <button
              key={days}
              className={s.secondary}
              onClick={() => {
                const failure = dispatch({ type: "advanceClock", days });
                if (failure) setError(failure);
              }}
            >
              +{days} {t("días", "days")}
            </button>
          ))}
        </div>
      </section>
      <form className={`${s.panel} ${s.form}`} onSubmit={save}>
        <h2>{t("Reglas del programa", "Program rules")}</h2>
        <p className={s.muted}>
          {t(
            "La recompensa se calcula sobre el margen del pedido, no sobre su precio. Los cambios solo afectan compras futuras.",
            "Rewards are calculated on order margin, not price. Changes affect future purchases only.",
          )}
        </p>
        <div className={s.formGrid}>
          <label>
            {t("Recompensa (% del margen)", "Reward (% of margin)")}
            <input
              name="earn"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={state.rules.earnRatePctOfMargin}
              required
            />
          </label>
          <label>
            {t("Espera para liberar (días)", "Release delay (days)")}
            <input
              name="hold"
              type="number"
              min="0"
              step="1"
              defaultValue={state.rules.holdbackDays}
              required
            />
          </label>
          <label>
            {t(
              "Vencimiento (días desde confirmación)",
              "Expiry (days after confirmation)",
            )}
            <input
              name="expiry"
              type="number"
              min="1"
              step="1"
              defaultValue={state.rules.expiryDays}
              required
            />
          </label>
          <label>
            {t("Máximo canje (% del pedido)", "Redemption limit (% of order)")}
            <input
              name="max"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={state.rules.maxRedeemPctOfOrder}
              required
            />
          </label>
        </div>
        <p className={s.muted}>
          {t(
            "El vencimiento debe ser posterior al período de espera.",
            "Expiry must be later than the release delay.",
          )}
        </p>
        <button className={s.primary}>
          {t("Guardar reglas", "Save rules")}
        </button>
        {message && (
          <p role="status" className={s.success}>
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
      </form>
    </>
  );
}
