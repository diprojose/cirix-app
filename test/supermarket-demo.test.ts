import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDemoState,
  quote,
  restoreDemo,
  stateSchema,
  storageKey,
  updateDemo,
  wallet,
  type DemoAction,
  type DemoState,
} from "@/modules/loyalty/demo/model";
import { createDemoStore } from "@/modules/loyalty/demo/store";
import {
  DEFAULT_BRAND_PROFILE,
  CIRIX_MARKET_PROFILE,
} from "@/modules/loyalty/branding/infrastructure/brand-profile-seed";
import { themeVariables } from "@/modules/loyalty/branding/ui/brand-theme";
import { contrastRatio } from "@/modules/loyalty/branding/application/color-contrast";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const NOW = Date.parse("2026-09-06T12:00:00Z");
const seed = () => createDemoState(DEFAULT_BRAND_PROFILE);
const apply = (state: DemoState, action: DemoAction) =>
  updateDemo(state, action, NOW);
function add(state: DemoState, quantity = 4) {
  return apply(state, { type: "quantity", id: state.products[0].id, quantity });
}
function checkout(
  state: DemoState,
  id = "order-1",
  extra: Partial<Extract<DemoAction, { type: "checkout" }>> = {},
) {
  return apply(state, {
    type: "checkout",
    id,
    customer: "Cliente demo",
    address: "Retiro",
    delivery: "pickup",
    coupon: "",
    redeem: false,
    ...extra,
  });
}

describe("visitor demo persistence", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("seeds a valid independent catalog for each brand and survives serialization", () => {
    const state = seed();
    expect(stateSchema.safeParse(state).success).toBe(true);
    expect(state.products).toHaveLength(8);
    expect(restoreDemo(JSON.stringify(add(state)), seed()).cart).toEqual(
      add(state).cart,
    );
    expect(storageKey(state.brand.slug)).not.toBe(
      storageKey(CIRIX_MARKET_PROFILE.slug),
    );
    expect(
      restoreDemo(JSON.stringify(state), createDemoState(CIRIX_MARKET_PROFILE))
        .brand.slug,
    ).toBe(CIRIX_MARKET_PROFILE.slug);
  });
  it("recovers from malformed, incompatible and invalid stored state", () => {
    const state = seed();
    for (const raw of [
      "{broken",
      "null",
      JSON.stringify({ ...state, version: 2 }),
      JSON.stringify({ ...state, cart: { bad: -1 } }),
      JSON.stringify({
        ...state,
        brand: { ...state.brand, primaryColor: "oops" },
      }),
    ])
      expect(restoreDemo(raw, state)).toBe(state);
  });
  it("persists per brand, restores on mount, and resets only that brand", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const store = createDemoStore(DEFAULT_BRAND_PROFILE);
    const unsubscribe = store.subscribe(vi.fn());
    expect(store.getSnapshot().ready).toBe(true);
    expect(
      store.dispatch({
        type: "quantity",
        id: seed().products[0].id,
        quantity: 2,
      }),
    ).toBeNull();
    data.set(storageKey(CIRIX_MARKET_PROFILE.slug), "independent");
    const reloaded = createDemoStore(DEFAULT_BRAND_PROFILE);
    reloaded.subscribe(vi.fn());
    expect(reloaded.getSnapshot().state.cart).toEqual(
      store.getSnapshot().state.cart,
    );
    store.reset();
    expect(store.getSnapshot().state.cart).toEqual({});
    expect(data.get(storageKey(CIRIX_MARKET_PROFILE.slug))).toBe("independent");
    unsubscribe();
  });
  it("remains usable and reports storage failure when storage is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("quota");
        },
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const store = createDemoStore(DEFAULT_BRAND_PROFILE);
    store.subscribe(vi.fn());
    expect(store.getSnapshot().storageError).toBe(true);
    expect(
      store.dispatch({
        type: "quantity",
        id: seed().products[0].id,
        quantity: 1,
      }),
    ).toBeNull();
    expect(Object.values(store.getSnapshot().state.cart)).toEqual([1]);
  });
});

describe("catalog and checkout", () => {
  it("enforces quantities, availability and an empty cart", () => {
    expect(() => add(seed(), 100)).toThrow();
    expect(() => add(seed(), 0.5)).toThrow();
    expect(() => checkout(seed())).toThrow(/vacío/);
    let state = add(seed());
    state = apply(state, {
      type: "product",
      product: { ...state.products[0], available: false },
    });
    expect(() => quote(state)).toThrow(/disponibles/);
    state = apply(state, {
      type: "quantity",
      id: state.products[0].id,
      quantity: 0,
    });
    expect(state.cart).toEqual({});
  });
  it("reprices the cart and freezes order snapshots", () => {
    let state = add(seed());
    state = apply(state, {
      type: "product",
      product: { ...state.products[0], priceCents: 500 },
    });
    expect(quote(state).subtotalCents).toBe(2000);
    state = checkout(state);
    state = apply(state, {
      type: "product",
      product: { ...state.products[0], priceCents: 900 },
    });
    expect(state.orders[0].totalCents).toBe(2000);
    expect(state.cart).toEqual({});
    state = apply(state, { type: "deleteProduct", id: state.products[0].id });
    expect(state.orders[0].lines[0].product.priceCents).toBe(500);
  });
  it("validates coupon minimum, activation, reuse and cancellation", () => {
    expect(() => quote(add(seed(), 1), "FRESCO10")).toThrow();
    let state = add(seed());
    expect(quote(state, " fresco10 ").discountCents).toBe(120);
    state = checkout(state, "first", { coupon: "FRESCO10" });
    state = add(state);
    expect(() => quote(state, "FRESCO10")).toThrow(/utilizado/);
    state = apply(state, { type: "status", id: "first", status: "cancelled" });
    expect(quote(state, "FRESCO10").discountCents).toBe(120);
    state = apply(state, {
      type: "coupon",
      coupon: { ...state.coupons[0], active: false },
    });
    expect(() => quote(state, "FRESCO10")).toThrow();
  });
  it("accepts a new local product and rejects unsafe image sources", () => {
    const state = seed();
    const newProduct = {
      ...state.products[0],
      id: "new",
      name: "Nuevo producto",
    };
    expect(
      apply(state, { type: "product", product: newProduct }).products,
    ).toHaveLength(9);
    expect(() =>
      apply(state, {
        type: "product",
        product: { ...newProduct, imageUrl: "javascript:alert(1)" },
      }),
    ).toThrow();
  });
});

describe("order and loyalty lifecycle", () => {
  it("accrues once on confirmation, releases after holdback and expires", () => {
    let state = checkout(add(seed()));
    expect(state.orders[0].rewardCents).toBe(24);
    expect(wallet(state, NOW).pending).toBe(0);
    state = apply(state, {
      type: "status",
      id: "order-1",
      status: "confirmed",
    });
    expect(wallet(state, NOW)).toMatchObject({ pending: 24, available: 0 });
    expect(
      apply(state, { type: "status", id: "order-1", status: "confirmed" }),
    ).toBe(state);
    state = apply(state, { type: "advanceClock", days: 7 });
    expect(wallet(state, NOW)).toMatchObject({ pending: 0, available: 24 });
    state = apply(state, { type: "advanceClock", days: 83 });
    expect(wallet(state, NOW)).toMatchObject({ available: 0, expired: 24 });
  });
  it("does not retroactively apply new reward rates or hold periods", () => {
    let state = checkout(add(seed()));
    state = apply(state, {
      type: "rules",
      rules: { ...state.rules, earnRatePctOfMargin: 50, holdbackDays: 0 },
    });
    state = apply(state, {
      type: "status",
      id: "order-1",
      status: "confirmed",
    });
    expect(state.orders[0]).toMatchObject({ rewardCents: 24, holdbackDays: 7 });
    expect(quote(add(state)).rewardCents).toBe(240);
  });
  it("limits redemption and refunds it when an order is cancelled", () => {
    let state = seed();
    state = apply(state, {
      type: "rules",
      rules: { ...state.rules, earnRatePctOfMargin: 100, holdbackDays: 0 },
    });
    state = checkout(add(state, 10));
    state = apply(state, {
      type: "status",
      id: "order-1",
      status: "confirmed",
    });
    state = add(state, 1);
    expect(quote(state, "", true, NOW).redeemedCents).toBe(150);
    state = checkout(state, "order-2", { redeem: true });
    expect(wallet(state, NOW).available).toBe(1050);
    state = apply(state, {
      type: "status",
      id: "order-2",
      status: "cancelled",
    });
    expect(wallet(state, NOW).available).toBe(1200);
  });
  it("does not expire spent credit twice against a newer reward", () => {
    let state = seed();
    state = apply(state, {
      type: "rules",
      rules: {
        ...state.rules,
        earnRatePctOfMargin: 100,
        holdbackDays: 0,
        expiryDays: 10,
      },
    });
    state = checkout(add(state, 1));
    state = apply(state, {
      type: "status",
      id: "order-1",
      status: "confirmed",
    });
    state = apply(state, { type: "advanceClock", days: 5 });
    state = checkout(add(state, 1), "order-2", { redeem: true });
    state = apply(state, {
      type: "status",
      id: "order-2",
      status: "confirmed",
    });
    state = apply(state, { type: "advanceClock", days: 5 });
    expect(wallet(state, NOW)).toMatchObject({
      available: 120,
      expired: 0,
      redeemed: 120,
    });
  });
  it("enforces allowed transitions, cancellation reversal and idempotent placement", () => {
    let state = checkout(add(seed()));
    expect(() =>
      apply(state, { type: "status", id: "order-1", status: "delivered" }),
    ).toThrow();
    expect(checkout(state)).toBe(state);
    state = apply(state, {
      type: "status",
      id: "order-1",
      status: "confirmed",
    });
    state = apply(state, {
      type: "status",
      id: "order-1",
      status: "cancelled",
    });
    expect(wallet(state, NOW)).toMatchObject({ available: 0, pending: 0 });
    expect(() =>
      apply(state, { type: "status", id: "order-1", status: "confirmed" }),
    ).toThrow();
  });
});

describe("theme and access boundaries", () => {
  it.each([
    DEFAULT_BRAND_PROFILE,
    CIRIX_MARKET_PROFILE,
    {
      ...DEFAULT_BRAND_PROFILE,
      primaryColor: "#ffff00",
      secondaryColor: "#ffffff",
      accentColor: "#000000",
    },
    {
      ...DEFAULT_BRAND_PROFILE,
      backgroundColor: "#151515",
      surfaceColor: "#252525",
    },
  ])(
    "keeps readable text and independent state colors for $primaryColor",
    (brand) => {
      const vars = themeVariables(brand);
      for (const bg of [brand.backgroundColor, brand.surfaceColor]) {
        for (const token of [
          "--color-text",
          "--color-text-muted",
          "--color-accent",
          "--color-action",
          "--color-danger",
          "--color-success",
          "--color-warning",
          "--color-focus",
        ] as const)
          expect(contrastRatio(vars[token], bg)).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrastRatio(vars["--color-on-accent"], vars["--color-accent-fill"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(vars["--color-on-benefit"], vars["--color-benefit"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(vars["--color-action-500"]).toBe(brand.accentColor);
      expect(vars["--color-danger-fill"]).toBe("#bd2440");
    },
  );
  it("applies a local brand including its uploaded logo without changing identity", () => {
    const state = seed();
    const updated = apply(state, {
      type: "brand",
      brand: {
        ...state.brand,
        displayName: "Mi Mercado",
        logoUrl: "data:image/png;base64,AAAA",
        primaryColor: "#333399",
        slug: "new-slug",
      },
    });
    expect(updated.brand).toMatchObject({
      slug: state.brand.slug,
      displayName: "Mi Mercado",
      primaryColor: "#333399",
      logoUrl: "data:image/png;base64,AAAA",
    });
    expect(restoreDemo(JSON.stringify(updated), state)).toEqual(updated);
  });
  it("opens demo administration and accounts while keeping operational routes protected", () => {
    for (const path of [
      "/es/demo/mercado-fresco/admin",
      "/es/demo/mercado-fresco/billetera",
      "/en/demo/cirix-market/referidos",
      "/es/demo/mercado-fresco/checkout",
    ]) {
      const response = proxy(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("location")).toBeNull();
    }
    for (const path of ["/es/admin", "/es/admin/products", "/es/billetera"]) {
      const response = proxy(new NextRequest(`http://localhost${path}`));
      expect(response.headers.get("location")).toContain("/es/login");
    }
  });
});
