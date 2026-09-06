"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemo } from "./provider";
import { quote, wallet } from "./model";
import { Shell, Empty, Heading, ProductImage, Quantity, s } from "./ui";

export function Cart({
  checkout = false,
  initialCoupon = "",
  initialRedeem = false,
}: {
  checkout?: boolean;
  initialCoupon?: string;
  initialRedeem?: boolean;
}) {
  const { state, basePath, dispatch, money, t } = useDemo();
  const router = useRouter();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [redeem, setRedeem] = useState(initialRedeem);
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const suggestedCoupon = state.coupons.find(
    (c) => c.code === "FRESCO10" && c.active,
  );
  let quoteError: string | null = null;
  let totals: ReturnType<typeof quote> | null = null;
  try {
    totals = quote(state, coupon, redeem);
  } catch (e) {
    quoteError = e instanceof Error ? e.message : "Error";
  }
  const lines = Object.entries(state.cart).map(([id, quantity]) => ({
    product: state.products.find((p) => p.id === id),
    quantity,
  }));
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !totals) return;
    const form = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    setSubmitting(true);
    const failure = dispatch({
      type: "checkout",
      id,
      customer: String(form.get("name") ?? ""),
      address:
        delivery === "pickup"
          ? "Retiro en tienda / Store pickup"
          : String(form.get("address") ?? ""),
      delivery,
      coupon,
      redeem,
    });
    if (failure) {
      setError(failure);
      setSubmitting(false);
    } else router.push(`${basePath}/orders/${id}`);
  }
  return (
    <Shell>
      {!lines.length ? (
        <Empty
          title={t(
            "Tu carrito espera algo fresco",
            "Your cart is ready for something fresh",
          )}
          detail={t(
            "Explora el mercado y agrega tus favoritos.",
            "Explore the market and add your favorites.",
          )}
        />
      ) : (
        <>
          <Heading
            eyebrow={
              checkout
                ? t("EL ÚLTIMO PASO", "ONE LAST STEP")
                : t("TU COMPRA DE HOY", "TODAY'S SHOP")
            }
            title={
              checkout
                ? t("Finalizar compra", "Checkout")
                : t("Mi carrito", "My cart")
            }
          >
            <Link href={`${basePath}/home`}>
              ← {t("Seguir comprando", "Keep shopping")}
            </Link>
          </Heading>
          <div className={s.checkoutGrid}>
            <div>
              <section className={s.panel}>
                {lines.map(
                  ({ product, quantity }) =>
                    product && (
                      <div className={s.cartLine} key={product.id}>
                        <Link href={`${basePath}/product/${product.id}`}>
                          <ProductImage product={product} />
                        </Link>
                        <div>
                          <h3>{product.name}</h3>
                          <span className={s.muted}>
                            {product.unit} · {money(product.priceCents)}
                          </span>
                          {!product.available && (
                            <p className={s.error}>
                              {t(
                                "Agotado: retíralo para continuar",
                                "Unavailable: remove to continue",
                              )}
                            </p>
                          )}
                          <button
                            className={s.textButton}
                            onClick={() =>
                              dispatch({
                                type: "quantity",
                                id: product.id,
                                quantity: 0,
                              })
                            }
                          >
                            {t("Eliminar", "Remove")}
                          </button>
                        </div>
                        <Quantity product={product} />
                        <b>{money(product.priceCents * quantity)}</b>
                      </div>
                    ),
                )}
              </section>
              {checkout && (
                <form
                  id="checkout-form"
                  onSubmit={submit}
                  className={`${s.panel} ${s.form}`}
                >
                  <h2>{t("Datos de entrega", "Delivery details")}</h2>
                  <p className={s.muted}>
                    {t(
                      "Usa datos ficticios para probar. No se realizará ningún cobro.",
                      "Use sample details to try it out. You will not be charged.",
                    )}
                  </p>
                  <label>
                    {t("Nombre", "Name")}
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={100}
                      placeholder={t("Cliente demo", "Demo customer")}
                    />
                  </label>
                  <fieldset>
                    <legend>
                      {t(
                        "¿Cómo quieres recibirlo?",
                        "How would you like your order?",
                      )}
                    </legend>
                    <label className={s.radio}>
                      <input
                        type="radio"
                        name="delivery"
                        checked={delivery === "pickup"}
                        onChange={() => setDelivery("pickup")}
                      />
                      {t("Retiro en tienda · sin costo", "Store pickup · free")}
                    </label>
                    <label className={s.radio}>
                      <input
                        type="radio"
                        name="delivery"
                        checked={delivery === "delivery"}
                        onChange={() => setDelivery("delivery")}
                      />
                      {t(
                        "Delivery · sin costo en este demo",
                        "Delivery · free in this demo",
                      )}
                    </label>
                  </fieldset>
                  {delivery === "delivery" && (
                    <label>
                      {t("Dirección de entrega", "Delivery address")}
                      <textarea
                        name="address"
                        required
                        maxLength={180}
                        autoComplete="street-address"
                      />
                    </label>
                  )}
                  <div className={s.infoBox}>
                    {t(
                      "Pago simulado. Tu pedido aparecerá en el administrador para que puedas confirmarlo y probar las recompensas.",
                      "Simulated payment. Your order appears in the admin so you can confirm it and try rewards.",
                    )}
                  </div>
                </form>
              )}
            </div>
            <aside className={`${s.panel} ${s.summary}`}>
              <h2>{t("Resumen de compra", "Order summary")}</h2>
              <label>
                {t("Código de descuento", "Discount code")}
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="FRESCO10"
                  maxLength={24}
                />
              </label>
              {suggestedCoupon && (
                <p className={s.muted}>
                  {t(
                    `FRESCO10: ${suggestedCoupon.percent}% en compras desde ${money(suggestedCoupon.minSpendCents)}. Un uso por cliente demo.`,
                    `FRESCO10: ${suggestedCoupon.percent}% off orders from ${money(suggestedCoupon.minSpendCents)}. One use per demo customer.`,
                  )}
                </p>
              )}
              <label className={s.radio}>
                <input
                  type="checkbox"
                  checked={redeem}
                  onChange={(e) => setRedeem(e.target.checked)}
                  disabled={!wallet(state).available}
                />
                {t("Usar mi saldo", "Use my credit")} (
                {money(wallet(state).available)})
              </label>
              {totals && (
                <>
                  <dl className={s.totals}>
                    <div>
                      <dt>Subtotal</dt>
                      <dd>{money(totals.subtotalCents)}</dd>
                    </div>
                    <div>
                      <dt>{t("Descuento", "Discount")}</dt>
                      <dd>−{money(totals.discountCents)}</dd>
                    </div>
                    <div>
                      <dt>{t("Saldo aplicado", "Credit applied")}</dt>
                      <dd>−{money(totals.redeemedCents)}</dd>
                    </div>
                    <div>
                      <dt>{t("Entrega", "Delivery")}</dt>
                      <dd>{t("Gratis", "Free")}</dd>
                    </div>
                    <div className={s.total}>
                      <dt>Total</dt>
                      <dd>{money(totals.totalCents)}</dd>
                    </div>
                  </dl>
                  <p className={s.rewardNotice}>
                    {t("Ganarás hasta", "Earn up to")}{" "}
                    <b>{money(totals.rewardCents)}</b>{" "}
                    {t(
                      "en recompensas al confirmar el pedido.",
                      "in rewards when your order is confirmed.",
                    )}
                  </p>
                </>
              )}
              {(quoteError || error) && (
                <p role="alert" className={s.error}>
                  {quoteError || error}
                </p>
              )}
              {checkout ? (
                <button
                  form="checkout-form"
                  type="submit"
                  className={s.primary}
                  disabled={!totals || submitting}
                >
                  {submitting
                    ? t("Confirmando…", "Submitting…")
                    : t("Crear pedido demo", "Place demo order")}{" "}
                  →
                </button>
              ) : (
                <Link
                  className={s.primary}
                  href={`${basePath}/checkout?coupon=${encodeURIComponent(coupon)}&redeem=${redeem ? "1" : "0"}`}
                >
                  {t("Continuar al checkout", "Continue to checkout")} →
                </Link>
              )}
              <p className={s.finePrint}>
                {t(
                  "Compra simulada · sin tarjetas ni pagos reales",
                  "Simulated checkout · no cards or real payments",
                )}
              </p>
            </aside>
          </div>
        </>
      )}
    </Shell>
  );
}
