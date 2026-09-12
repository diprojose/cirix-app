"use client";

import { useToast } from "@/components/toast-provider";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "./provider";
import { wallet, type DemoOrder } from "./model";
import { Shell, Empty, Heading, s } from "./ui";

export function useStatusLabel() {
  const { t } = useDemo();
  return (status: DemoOrder["status"]) =>
    ({
      received: t("Recibido", "Received"),
      payment_reported: t("Pago reportado", "Payment reported"),
      confirmed: t("Confirmado", "Confirmed"),
      preparing: t("En preparación", "Preparing"),
      ready: t("Listo", "Ready"),
      delivered: t("Entregado", "Delivered"),
      cancelled: t("Cancelado", "Cancelled"),
    })[status];
}
export function OrdersTable({ admin = false }: { admin?: boolean }) {
  const { state, basePath, t, money } = useDemo();
  const label = useStatusLabel();
  if (!state.orders.length)
    return (
      <p className={s.muted}>
        {t(
          "Todavía no hay pedidos. Completa una compra para verlos aquí.",
          "No orders yet. Complete a purchase to see them here.",
        )}
      </p>
    );
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{t("Pedido", "Order")}</th>
            <th>{t("Cliente", "Customer")}</th>
            <th>{t("Estado", "Status")}</th>
            <th>Total</th>
            <th>{t("Recompensa", "Reward")}</th>
          </tr>
        </thead>
        <tbody>
          {state.orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link
                  href={`${basePath}/${admin ? "admin/" : ""}orders/${o.id}`}
                >
                  #{o.id.slice(0, 8)}
                </Link>
              </td>
              <td>{o.customer}</td>
              <td>
                <span className={s.status} data-status={o.status}>
                  {label(o.status)}
                </span>
              </td>
              <td>{money(o.totalCents)}</td>
              <td>{money(o.status === "cancelled" ? 0 : o.rewardCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function OrderDetail({
  id,
  admin = false,
}: {
  id: string;
  admin?: boolean;
}) {
  const { state, dispatch, basePath, t, money } = useDemo();
  const label = useStatusLabel();
  const toast = useToast();
  const order = state.orders.find((o) => o.id === id);
  if (!order)
    return (
      <Empty
        title={t("No encontramos este pedido", "Order not found")}
        detail={t(
          "Los pedidos demo pertenecen a este navegador y se eliminan al restablecerlo.",
          "Demo orders belong to this browser and are removed when you reset it.",
        )}
      />
    );
  const steps: DemoOrder["status"][] = [
    "received",
    "confirmed",
    "preparing",
    "ready",
    "delivered",
  ];
  const next = steps[steps.indexOf(order.status) + 1];
  const change = (status: DemoOrder["status"]) =>
    toast.error(dispatch({ type: "status", id, status }));
  return (
    <>
      <Heading
        eyebrow={t("DETALLE DE TU COMPRA", "YOUR ORDER DETAILS")}
        title={`${t("Pedido", "Order")} #${id.slice(0, 8)}`}
      >
        <span className={s.status} data-status={order.status}>
          {label(order.status)}
        </span>
      </Heading>
      {!admin && (
        <p className={s.infoBox}>
          {t(
            "Tu pedido demo está registrado. Puedes abrir el administrador para confirmar el pago simulado y seguir su preparación.",
            "Your demo order is placed. Open the admin to confirm the simulated payment and follow its progress.",
          )}{" "}
          <Link href={`${basePath}/admin/orders/${id}`}>
            {t("Gestionar pedido", "Manage order")} →
          </Link>
        </p>
      )}
      <div
        className={s.timeline}
        aria-label={t("Progreso del pedido", "Order progress")}
      >
        {steps.map((step, index) => (
          <span
            key={step}
            data-complete={
              order.status !== "cancelled" &&
              index <= steps.indexOf(order.status)
            }
          >
            {index + 1}. {label(step)}
          </span>
        ))}
      </div>
      <div className={s.checkoutGrid}>
        <section className={s.panel}>
          <h2>{t("Productos", "Products")}</h2>
          {order.lines.map((l) => (
            <div className={s.totals} key={l.product.id}>
              <div>
                <span>
                  {l.quantity} × {l.product.name}{" "}
                  <small>({l.product.unit})</small>
                </span>
                <b>{money(l.product.priceCents * l.quantity)}</b>
              </div>
            </div>
          ))}
          <dl className={s.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(order.subtotalCents)}</dd>
            </div>
            <div>
              <dt>{t("Descuento", "Discount")}</dt>
              <dd>−{money(order.discountCents)}</dd>
            </div>
            <div>
              <dt>{t("Saldo utilizado", "Credit used")}</dt>
              <dd>−{money(order.redeemedCents)}</dd>
            </div>
            <div className={s.total}>
              <dt>Total</dt>
              <dd>{money(order.totalCents)}</dd>
            </div>
          </dl>
        </section>
        <aside className={s.panel}>
          <h2>{t("Entrega y beneficios", "Delivery & rewards")}</h2>
          <p>{order.customer}</p>
          <p>{order.address}</p>
          <p className={s.rewardNotice}>
            {t("Recompensa del pedido", "Order reward")}:{" "}
            <b>{money(order.status === "cancelled" ? 0 : order.rewardCents)}</b>
            <br />
            {t(
              `Disponible ${order.holdbackDays} días después de confirmar. Vence a los ${order.expiryDays} días.`,
              `Available ${order.holdbackDays} days after confirmation. Expires after ${order.expiryDays} days.`,
            )}
          </p>
          {admin && !["cancelled", "delivered"].includes(order.status) && (
            <div className={s.form}>
              {next && (
                <button className={s.primary} onClick={() => change(next)}>
                  {label(next)} →
                </button>
              )}
              <button
                className={s.dangerButton}
                onClick={() => change("cancelled")}
              >
                {t("Cancelar pedido", "Cancel order")}
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export function Account({
  page = "orders",
  id,
}: {
  page?: "orders" | "wallet" | "referrals" | "notifications";
  id?: string;
}) {
  const { state, basePath, t, money } = useDemo();
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const balance = wallet(state);
  return (
    <Shell>
      {id ? (
        <OrderDetail id={id} />
      ) : page === "orders" ? (
        <>
          <Heading
            eyebrow={t("MI CUENTA DEMO", "MY DEMO ACCOUNT")}
            title={t("Mis pedidos", "My orders")}
          />
          <section className={s.panel}>
            <OrdersTable />
          </section>
          <Link className={s.primary} href={`${basePath}/home`}>
            {t("Hacer una compra", "Start shopping")} →
          </Link>
        </>
      ) : page === "wallet" ? (
        <>
          <Heading
            eyebrow={t("CADA COMPRA CUENTA", "EVERY SHOP COUNTS")}
            title={t("Mis recompensas", "My rewards")}
          />
          <div className={s.checkoutGrid}>
            <div className={s.walletHero}>
              <p>{t("SALDO DISPONIBLE", "AVAILABLE CREDIT")}</p>
              <strong>{money(balance.available)}</strong>
              <p>
                {t(
                  `Úsalo para pagar hasta el ${state.rules.maxRedeemPctOfOrder}% de tu próxima compra.`,
                  `Use it to cover up to ${state.rules.maxRedeemPctOfOrder}% of your next order.`,
                )}
              </p>
              <Link className={s.heroButton} href={`${basePath}/home`}>
                {t("Volver al mercado", "Back to the market")} →
              </Link>
            </div>
            <section className={s.panel}>
              <h2>
                {t("Así funcionan tus beneficios", "How your rewards work")}
              </h2>
              <p>
                {t(
                  "1. Haz tu compra y confirma el pedido en el administrador demo.",
                  "1. Shop and confirm the order in the demo admin.",
                )}
              </p>
              <p>
                {t(
                  `2. Tu saldo se libera después de ${state.rules.holdbackDays} días.`,
                  `2. Credit becomes available after ${state.rules.holdbackDays} days.`,
                )}
              </p>
              <p>
                {t(
                  "3. Aplica tu saldo al finalizar tu próxima compra.",
                  "3. Apply your credit at your next checkout.",
                )}
              </p>
              <Link href={`${basePath}/admin/rewards`} className={s.textButton}>
                {t("Probar el paso del tiempo", "Try advancing time")} →
              </Link>
            </section>
          </div>
          <div className={s.metrics}>
            <div className={s.metric}>
              <span>{t("Por liberar", "Pending")}</span>
              <strong>{money(balance.pending)}</strong>
            </div>
            <div className={s.metric}>
              <span>{t("Saldo usado", "Credit used")}</span>
              <strong>{money(balance.redeemed)}</strong>
            </div>
            <div className={s.metric}>
              <span>{t("Recompensas vencidas", "Expired rewards")}</span>
              <strong>{money(balance.expired)}</strong>
            </div>
          </div>
          <section className={s.panel}>
            <h2>
              {t("Tus compras y recompensas", "Your purchases & rewards")}
            </h2>
            <OrdersTable />
          </section>
        </>
      ) : page === "referrals" ? (
        <>
          <Heading
            eyebrow={t("LO BUENO SE COMPARTE", "GOOD THINGS ARE WORTH SHARING")}
            title={t(
              "Invita a conocer tu mercado",
              "Invite a friend to your market",
            )}
          />
          <section className={s.panel}>
            <h2>
              {t(
                "Comparte una compra más fresca",
                "Share a fresher way to shop",
              )}
            </h2>
            <p>
              {t(
                "Envía el enlace del mercado a tus amigos. Abrirán su propio demo, con la marca base y datos independientes.",
                "Send friends the market link. They will open their own demo with the base brand and independent data.",
              )}
            </p>
            <p className={s.muted}>
              {t(
                "El demo local no conecta visitantes ni concede premios por invitaciones. El programa real de referidos se mantiene en el módulo operativo.",
                "This local demo does not connect visitors or award referral credit. The real referral program remains in the operational module.",
              )}
            </p>
            <button
              className={s.primary}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}${basePath}/home`,
                  );
                  setCopied(true);
                } catch {
                  toast.error(t(
                    "No se pudo copiar. Copia la dirección de la tienda desde el navegador.",
                    "Could not copy. Copy the store address from the browser.",
                  ));
                }
              }}
            >
              {copied
                ? t("Enlace copiado", "Link copied")
                : t("Copiar enlace del mercado", "Copy market link")}
            </button>

          </section>
        </>
      ) : (
        <>
          <Heading title={t("Novedades de tus pedidos", "Order updates")} />
          <section className={s.panel}>
            <p className={s.muted}>
              {t(
                "Consulta el estado de tus compras. Las notificaciones externas están simuladas.",
                "Check your order status. External notifications are simulated.",
              )}
            </p>
            <OrdersTable />
          </section>
        </>
      )}
    </Shell>
  );
}
