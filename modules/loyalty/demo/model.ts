import { z } from "zod";
import type { BrandProfile } from "../branding/application/brand-profile";
import { validateBrandProfile } from "../branding/application/brand-profile";
import { buildProductSeed } from "../catalog/infrastructure/persistence/product-seed";
import { toProductDto } from "../catalog/application/dtos/product-dto";
import { MAX_QUANTITY } from "../cart/domain/value-objects/quantity";
import {
  canTransition,
  type OrderStatus,
} from "../ordering/domain/value-objects/order-status";
import { RewardRules } from "../rewards/domain/value-objects/reward-rules";
import { defaultRewardRules } from "../rewards/infrastructure/config/reward-rules-defaults";

const cents = z.number().int().min(0).max(100_000_000);
const text = z.string().trim().min(1).max(180);
export const imageSource = z
  .string()
  .max(1_500_000)
  .refine(
    (value) =>
      !value ||
      /^\/(?!\/)/.test(value) ||
      /^https:\/\//.test(value) ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
  );
export const productSchema = z.object({
  id: text,
  name: text,
  description: z.string().max(1000),
  priceCents: cents,
  costCents: cents,
  imageUrl: imageSource,
  featured: z.boolean(),
  available: z.boolean(),
  category: z.enum(["vegetables", "fruit", "bundles"]),
  unit: text,
  previousPriceCents: cents.optional(),
});
export type DemoProduct = z.infer<typeof productSchema>;
const rulesSchema = z
  .object({
    earnRatePctOfMargin: z.number().min(0).max(100),
    holdbackDays: z.number().int().min(0),
    expiryDays: z.number().int().min(1),
    maxRedeemPctOfOrder: z.number().min(0).max(100),
  })
  .refine((r) => r.expiryDays > r.holdbackDays);
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{3,24}$/),
  percent: z.number().min(1).max(100),
  minSpendCents: cents,
  active: z.boolean(),
});
const lineSchema = z.object({
  product: productSchema,
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
const orderSchema = z.object({
  id: text,
  createdAt: z.string().datetime(),
  customer: text,
  address: text,
  delivery: z.enum(["pickup", "delivery"]),
  lines: z.array(lineSchema).min(1),
  subtotalCents: cents,
  discountCents: cents,
  redeemedCents: cents,
  totalCents: cents,
  rewardCents: cents,
  status: z.enum([
    "received",
    "payment_reported",
    "confirmed",
    "preparing",
    "ready",
    "delivered",
    "cancelled",
  ]),
  coupon: z.string(),
  confirmedAt: z.string().datetime().nullable(),
  holdbackDays: z.number().int().min(0),
  expiryDays: z.number().int().min(1),
});
export type DemoOrder = z.infer<typeof orderSchema>;
const brandSchema = z
  .object({
    id: text,
    slug: text,
    displayName: text,
    tagline: z.string(),
    logoUrl: imageSource,
    primaryColor: text,
    secondaryColor: text,
    accentColor: text,
    backgroundColor: text,
    surfaceColor: text,
    heroTitle: text,
    heroSubtitle: z.string(),
    active: z.boolean(),
    updatedAt: z.string(),
  })
  .refine((b) => validateBrandProfile({ ...b, logoUrl: "" }).ok);
export const stateSchema = z.object({
  version: z.literal(1),
  brand: brandSchema,
  products: z.array(productSchema),
  cart: z.record(z.string(), z.number().int().min(1).max(MAX_QUANTITY)),
  orders: z.array(orderSchema),
  coupons: z.array(couponSchema),
  rules: rulesSchema,
  clockOffsetDays: z.number().int().min(0).max(36500),
});
export type DemoState = z.infer<typeof stateSchema>;
export const storageKey = (slug: string) =>
  `mixmag:supermarket-demo:v1:${slug}`;

export function createDemoState(brand: BrandProfile): DemoState {
  const rules = defaultRewardRules();
  const products: DemoProduct[] = buildProductSeed()
    .map(toProductDto)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      costCents: p.costCents,
      imageUrl: p.imageUrl,
      featured: p.featured,
      available: p.available,
      category: p.name === "Aguacates" ? "fruit" : "vegetables",
      unit: ["Tomates", "Zanahorias", "Pimentón rojo"].includes(p.name)
        ? "1 kg"
        : "1 ud.",
      ...(p.featured ? { previousPriceCents: p.priceCents + 100 } : {}),
    }));
  products.push(
    {
      ...products[0],
      id: "tomates-familia",
      name: "Tomates · pack familiar",
      unit: "2 kg",
      priceCents: 500,
      costCents: 360,
      previousPriceCents: 600,
      category: "bundles",
      description: "Dos kilos de tomates frescos para cocinar toda la semana.",
    },
    {
      ...products[1],
      id: "aguacates-pack",
      name: "Aguacates · pack de 3",
      unit: "3 uds.",
      priceCents: 1000,
      costCents: 720,
      previousPriceCents: 1200,
      category: "bundles",
      description:
        "Tres aguacates para compartir. Ideales para ensaladas y guacamole.",
    },
  );
  return {
    version: 1,
    brand,
    products,
    cart: {},
    orders: [],
    coupons: [
      { code: "FRESCO10", percent: 10, minSpendCents: 1000, active: true },
    ],
    rules: {
      earnRatePctOfMargin: rules.earnRatePctOfMargin,
      holdbackDays: rules.holdbackDays,
      expiryDays: rules.expiryDays,
      maxRedeemPctOfOrder: rules.maxRedeemPctOfOrder,
    },
    clockOffsetDays: 0,
  };
}

export function restoreDemo(raw: string | null, seed: DemoState): DemoState {
  if (!raw) return seed;
  try {
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.brand.slug === seed.brand.slug
      ? parsed.data
      : seed;
  } catch {
    return seed;
  }
}

export const demoNow = (state: DemoState, now = Date.now()) =>
  now + state.clockOffsetDays * 86_400_000;
export function wallet(state: DemoState, now = Date.now()) {
  const currentTime = demoNow(state, now);
  const orders = state.orders.filter((o) => o.status !== "cancelled");
  const lots = orders
    .filter((o) => o.confirmedAt)
    .map((o) => ({
      remaining: o.rewardCents,
      releaseAt: Date.parse(o.confirmedAt!) + o.holdbackDays * 86_400_000,
      expiresAt: Date.parse(o.confirmedAt!) + o.expiryDays * 86_400_000,
    }))
    .sort((a, b) => a.expiresAt - b.expiresAt);
  let redeemed = 0,
    debt = 0;
  for (const order of [...orders].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  )) {
    let remaining = order.redeemedCents;
    redeemed += remaining;
    const at = Date.parse(order.createdAt);
    for (const lot of lots) {
      if (lot.releaseAt > at || lot.expiresAt <= at) continue;
      const amount = Math.min(lot.remaining, remaining);
      lot.remaining -= amount;
      remaining -= amount;
    }
    debt += remaining;
  }
  let available = 0,
    pending = 0,
    expired = 0;
  for (const lot of lots) {
    if (lot.expiresAt <= currentTime) expired += lot.remaining;
    else if (lot.releaseAt <= currentTime) available += lot.remaining;
    else pending += lot.remaining;
  }
  // Spend the earliest-expiring credits first. Spent credits cannot expire a
  // second time and reduce newly earned credit. Cancellations reverse entries.
  return {
    available: Math.max(0, available - debt),
    pending,
    expired,
    redeemed,
  };
}

export function quote(
  state: DemoState,
  code = "",
  redeem = false,
  now = Date.now(),
) {
  const lines = Object.entries(state.cart)
    .map(([id, quantity]) => ({
      product: state.products.find((p) => p.id === id)!,
      quantity,
    }))
    .filter((l) => l.product);
  if (lines.some((l) => !l.product.available))
    throw new Error(
      "Hay productos no disponibles. Retíralos del carrito. / Remove unavailable products.",
    );
  const subtotalCents = lines.reduce(
    (sum, l) => sum + l.product.priceCents * l.quantity,
    0,
  );
  const normalizedCode = code.trim().toUpperCase();
  const coupon = normalizedCode
    ? state.coupons.find((c) => c.code === normalizedCode && c.active)
    : null;
  if (normalizedCode && (!coupon || subtotalCents < coupon.minSpendCents))
    throw new Error(
      "Cupón inválido o compra mínima no alcanzada. / Invalid coupon or minimum spend not met.",
    );
  if (
    normalizedCode &&
    state.orders.some(
      (o) => o.coupon === normalizedCode && o.status !== "cancelled",
    )
  )
    throw new Error("Este cupón ya fue utilizado. / Coupon already used.");
  const discountCents = coupon
    ? Math.round((subtotalCents * coupon.percent) / 100)
    : 0;
  const rules = RewardRules.create(state.rules);
  if (!rules.ok) throw new Error(rules.error.message);
  const redeemedCents = redeem
    ? Math.min(
        wallet(state, now).available,
        rules.value.maxRedeemFor(subtotalCents),
        subtotalCents - discountCents,
      )
    : 0;
  const margin = lines.reduce(
    (sum, l) =>
      sum +
      Math.max(0, l.product.priceCents - l.product.costCents) * l.quantity,
    0,
  );
  return {
    lines,
    subtotalCents,
    discountCents,
    redeemedCents,
    totalCents: subtotalCents - discountCents - redeemedCents,
    rewardCents: rules.value.earnFor(margin),
  };
}

export type DemoAction =
  | { type: "quantity"; id: string; quantity: number }
  | { type: "brand"; brand: BrandProfile }
  | { type: "product"; product: DemoProduct }
  | { type: "deleteProduct"; id: string }
  | { type: "coupon"; coupon: z.infer<typeof couponSchema> }
  | { type: "deleteCoupon"; code: string }
  | { type: "rules"; rules: DemoState["rules"] }
  | { type: "advanceClock"; days: number }
  | {
      type: "checkout";
      id: string;
      customer: string;
      address: string;
      delivery: "pickup" | "delivery";
      coupon: string;
      redeem: boolean;
    }
  | { type: "status"; id: string; status: OrderStatus };

export function updateDemo(
  state: DemoState,
  action: DemoAction,
  now = Date.now(),
): DemoState {
  switch (action.type) {
    case "quantity": {
      if (
        !Number.isInteger(action.quantity) ||
        action.quantity < 0 ||
        action.quantity > MAX_QUANTITY
      )
        throw new Error(
          `Cantidad: 0–${MAX_QUANTITY} / Quantity: 0–${MAX_QUANTITY}`,
        );
      const product = state.products.find((p) => p.id === action.id);
      if (action.quantity > 0 && !product?.available)
        throw new Error("Producto no disponible / Product unavailable");
      const cart = { ...state.cart };
      if (action.quantity === 0) delete cart[action.id];
      else cart[action.id] = action.quantity;
      return { ...state, cart };
    }
    case "brand": {
      const brand = brandSchema.parse(action.brand);
      return {
        ...state,
        brand: {
          ...brand,
          id: state.brand.id,
          slug: state.brand.slug,
          active: true,
        },
      };
    }
    case "product": {
      const product = productSchema.parse(action.product);
      return {
        ...state,
        products: state.products.some((p) => p.id === product.id)
          ? state.products.map((p) => (p.id === product.id ? product : p))
          : [...state.products, product],
      };
    }
    case "deleteProduct": {
      const cart = { ...state.cart };
      delete cart[action.id];
      return {
        ...state,
        cart,
        products: state.products.filter((p) => p.id !== action.id),
      };
    }
    case "coupon": {
      const coupon = couponSchema.parse(action.coupon);
      return {
        ...state,
        coupons: [
          ...state.coupons.filter((c) => c.code !== coupon.code),
          coupon,
        ],
      };
    }
    case "deleteCoupon":
      return {
        ...state,
        coupons: state.coupons.filter((c) => c.code !== action.code),
      };
    case "rules":
      return { ...state, rules: rulesSchema.parse(action.rules) };
    case "advanceClock":
      return {
        ...state,
        clockOffsetDays: z
          .number()
          .int()
          .min(0)
          .max(36500)
          .parse(state.clockOffsetDays + action.days),
      };
    case "checkout": {
      if (state.orders.some((o) => o.id === action.id)) return state;
      const totals = quote(state, action.coupon, action.redeem, now);
      if (!totals.lines.length)
        throw new Error("Tu carrito está vacío / Your cart is empty");
      const order = orderSchema.parse({
        ...totals,
        id: action.id,
        customer: action.customer,
        address: action.address,
        delivery: action.delivery,
        createdAt: new Date(demoNow(state, now)).toISOString(),
        coupon: action.coupon.trim().toUpperCase(),
        status: "received",
        confirmedAt: null,
        holdbackDays: state.rules.holdbackDays,
        expiryDays: state.rules.expiryDays,
      });
      return { ...state, cart: {}, orders: [order, ...state.orders] };
    }
    case "status": {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order) throw new Error("Pedido no encontrado / Order not found");
      if (order.status === action.status) return state;
      if (!canTransition(order.status, action.status))
        throw new Error(
          "Cambio de estado no permitido / Invalid order transition",
        );
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id !== order.id
            ? o
            : {
                ...o,
                status: action.status,
                confirmedAt:
                  action.status === "confirmed"
                    ? new Date(demoNow(state, now)).toISOString()
                    : o.confirmedAt,
              },
        ),
      };
    }
  }
}
