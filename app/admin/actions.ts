"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/auth/dal";
import {
  makeReviewPayment,
  makeAdvanceOrderStatus,
} from "@/modules/ordering/infrastructure/di/ordering-container";
import type { OrderAction } from "@/modules/ordering/application/use-cases/advance-order-status";
import {
  makeCreateProduct,
  makeUpdateProduct,
  makeDeleteProduct,
} from "@/modules/catalog/infrastructure/di/catalog-container";
import { makeSetManualExchangeRate } from "@/modules/pricing/infrastructure/di/pricing-container";
import {
  makeGrantPremium,
  makeRevokePremium,
  makeResolveUserByEmail,
} from "@/modules/iam/infrastructure/di/iam-container";
import { makeMarkPremiumRequestGranted } from "@/modules/subscription/infrastructure/di/subscription-container";
import {
  makeCreateRecipe,
  makeUpdateRecipe,
  makeDeleteRecipe,
} from "@/modules/recipes/infrastructure/di/recipes-container";
import {
  makeAccruePurchaseReward,
  makeReverseOrderRewards,
  makeSaveRewardRules,
  makeReleaseDueRewards,
  makeExpireRewards,
  makeAdjustBalanceManually,
} from "@/modules/rewards/infrastructure/di/rewards-container";
import {
  makeCreateCoupon,
  makeUpdateCoupon,
  makeDeleteCoupon,
  makeReverseCouponRedemption,
} from "@/modules/coupons/infrastructure/di/coupons-container";
import {
  makeRecordReferredPurchase,
  makeReverseReferralOnOrderCancel,
} from "@/modules/referrals/infrastructure/di/referrals-container";
import {
  makeRecordConfirmedOrder,
  makeRecalculateSegments,
  makeGenerateWinBack,
} from "@/modules/customers/infrastructure/di/customers-container";
import {
  makeRaiseFraudAlert,
  makeResolveFraudAlert,
} from "@/modules/fraud/infrastructure/di/fraud-container";
import { makeSendNotification } from "@/modules/notifications/infrastructure/di/notifications-container";
import { formatPrice } from "@/lib/format/money";

/*
 * Admin server actions (primary adapters for operator use cases). Every action
 * re-checks the operator guard on the server — the /admin layout guard alone is
 * not enough, since actions are network endpoints of their own. Failures
 * redirect back with a human message in the `error` query param; the plain
 * <form action> pattern keeps the panel almost JS-free.
 */

/** Redirects back to `path` carrying a readable error for the banner. */
function failTo(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

/** Operator review of a payment report: verified or rejected. */
export async function reviewPaymentAction(
  orderId: string,
  paymentId: string,
  verdict: "verified" | "rejected"
): Promise<void> {
  await requireOperator();

  const result = await makeReviewPayment().execute({ orderId, paymentId, verdict });
  if (!result.ok) {
    failTo(`/admin/orders/${orderId}`, result.error.message);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
}

/** Operator lifecycle command on an order (confirm, preparing, ready, …). */
export async function advanceOrderAction(
  orderId: string,
  action: OrderAction
): Promise<void> {
  await requireOperator();

  const result = await makeAdvanceOrderStatus().execute({ orderId, action });
  if (!result.ok) {
    failTo(`/admin/orders/${orderId}`, result.error.message);
  }

  // Reward side-effects hang off the lifecycle: confirming an order accrues its
  // credit (idempotently), cancelling it reverses that credit. Both are
  // best-effort — the order transition already succeeded, so a rewards hiccup
  // must not fail the operator's action, and idempotency makes a retry safe.
  if (action === "confirm") {
    await makeAccruePurchaseReward().execute({
      orderId,
      customerUid: result.value.customerUid,
      marginCents: result.value.marginCents,
    });
    // A confirmed order also advances the buyer's referral (if any) toward the
    // referrer's reward — unlocked on their second purchase (BR-08) — and folds
    // into their retention profile (RFM segment + weekly streak, BR-21/BR-25).
    if (result.value.customerUid) {
      const referral = await makeRecordReferredPurchase().execute({
        referredUid: result.value.customerUid,
        orderId,
      });
      if (referral.ok && referral.value.awarded && referral.value.referrerUid) {
        await makeSendNotification().execute({
          customerUid: referral.value.referrerUid,
          type: "referral_reward",
          title: "¡Ganaste recompensa!",
          body: `Un referido tuyo desbloqueó ${formatPrice(referral.value.amountCents, "USD")} de crédito.`,
        });
      }
      await makeRecordConfirmedOrder().execute({
        customerUid: result.value.customerUid,
        orderTotalCents: result.value.totalCents,
      });
    }
  } else if (action === "cancel") {
    await makeReverseOrderRewards().execute({ orderId });
    await makeReverseCouponRedemption().execute({ orderId });
    await makeReverseReferralOnOrderCancel().execute({ orderId });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
}

/** Creates or updates a product from the admin form (hidden `id` ⇒ update). */
export async function saveProductAction(formData: FormData): Promise<void> {
  await requireOperator();

  const id = String(formData.get("id") ?? "").trim();
  const backPath = id ? `/admin/products/${id}` : "/admin/products/new";

  const priceRaw = String(formData.get("price") ?? "").replace(",", ".");
  const price = Number.parseFloat(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    failTo(backPath, "El precio debe ser un número no negativo (en dólares).");
  }

  // Cost is optional (empty ⇒ 0) and operator-only; it never reaches the store.
  const costRaw = String(formData.get("cost") ?? "").trim().replace(",", ".");
  const cost = costRaw === "" ? 0 : Number.parseFloat(costRaw);
  if (!Number.isFinite(cost) || cost < 0) {
    failTo(backPath, "El costo debe ser un número no negativo (en dólares).");
  }

  const input = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    priceCents: Math.round(price * 100),
    costCents: Math.round(cost * 100),
    currency: "USD",
    department: String(formData.get("department") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    featured: formData.get("featured") === "on",
    available: formData.get("available") === "on",
  };

  const result = id
    ? await makeUpdateProduct().execute({ id, ...input })
    : await makeCreateProduct().execute(input);
  if (!result.ok) {
    failTo(backPath, result.error.message);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

/** Deletes a product (operator action; prefer hiding via `available`). */
export async function deleteProductAction(id: string): Promise<void> {
  await requireOperator();

  const result = await makeDeleteProduct().execute({ id });
  if (!result.ok) {
    failTo("/admin/products", result.error.message);
  }
  revalidatePath("/admin/products");
  revalidatePath("/");
}

/** Creates or updates a recipe from the admin form (hidden `id` ⇒ update). */
export async function saveRecipeAction(formData: FormData): Promise<void> {
  await requireOperator();

  const id = String(formData.get("id") ?? "").trim();
  const backPath = id ? `/admin/recipes/${id}` : "/admin/recipes/new";

  const durationRaw = String(formData.get("durationMinutes") ?? "").trim();
  const durationMinutes = durationRaw ? Number.parseInt(durationRaw, 10) : null;

  // Ingredients and steps arrive one per line from their textareas.
  const toLines = (value: FormDataEntryValue | null): string[] =>
    String(value ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  const input = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    difficulty: String(formData.get("difficulty") ?? ""),
    durationMinutes,
    ingredients: toLines(formData.get("ingredients")),
    steps: toLines(formData.get("steps")),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    videoUrl: String(formData.get("videoUrl") ?? ""),
    published: formData.get("published") === "on",
  };

  const result = id
    ? await makeUpdateRecipe().execute({ id, ...input })
    : await makeCreateRecipe().execute(input);
  if (!result.ok) {
    failTo(backPath, result.error.message);
  }

  revalidatePath("/admin/recipes");
  revalidatePath("/recipes");
  redirect("/admin/recipes");
}

/** Deletes a recipe (operator action; prefer unpublishing). */
export async function deleteRecipeAction(id: string): Promise<void> {
  await requireOperator();

  const result = await makeDeleteRecipe().execute({ id });
  if (!result.ok) {
    failTo("/admin/recipes", result.error.message);
  }
  revalidatePath("/admin/recipes");
  revalidatePath("/recipes");
}

/** Sets the operator's manual USD→VES rate. */
export async function setManualRateAction(formData: FormData): Promise<void> {
  await requireOperator();

  const raw = String(formData.get("vesPerUsd") ?? "").replace(",", ".");
  const vesPerUsd = Number.parseFloat(raw);

  const result = await makeSetManualExchangeRate().execute({ vesPerUsd });
  if (!result.ok) {
    failTo("/admin/settings", "La tasa debe ser un número positivo (Bs por $1).");
  }
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

/** Grants premium to the user behind an email (optionally closing a request). */
export async function grantPremiumByEmailAction(formData: FormData): Promise<void> {
  await requireOperator();

  const email = String(formData.get("email") ?? "");
  const requestId = String(formData.get("requestId") ?? "").trim();

  const resolved = await makeResolveUserByEmail().execute({ email });
  if (!resolved.ok) {
    failTo("/admin/premium", `No existe una cuenta registrada con "${email}".`);
  }

  const granted = await makeGrantPremium().execute({ uid: resolved.value.uid });
  if (!granted.ok) {
    failTo("/admin/premium", granted.error.message);
  }
  if (requestId) {
    await makeMarkPremiumRequestGranted().execute({ requestId });
  }

  revalidatePath("/admin/premium");
  redirect(
    "/admin/premium?granted=" +
      encodeURIComponent(resolved.value.email) +
      "&until=" +
      encodeURIComponent(granted.value.premiumUntil.slice(0, 10))
  );
}

/** Removes the premium claim from the user behind an email. */
export async function revokePremiumByEmailAction(formData: FormData): Promise<void> {
  await requireOperator();

  const email = String(formData.get("email") ?? "");
  const resolved = await makeResolveUserByEmail().execute({ email });
  if (!resolved.ok) {
    failTo("/admin/premium", `No existe una cuenta registrada con "${email}".`);
  }

  await makeRevokePremium().execute({ uid: resolved.value.uid });
  revalidatePath("/admin/premium");
  redirect("/admin/premium?revoked=" + encodeURIComponent(resolved.value.email));
}

/** Saves the operator's reward configuration (earn rate, holdback, expiry, cap). */
export async function saveRewardRulesAction(formData: FormData): Promise<void> {
  const viewer = await requireOperator();

  const numberField = (name: string): number =>
    Number.parseFloat(String(formData.get(name) ?? "").replace(",", "."));
  const intField = (name: string): number =>
    Number.parseInt(String(formData.get(name) ?? "").trim(), 10);

  const result = await makeSaveRewardRules().execute({
    operatorId: viewer.uid ?? "operator",
    earnRatePctOfMargin: numberField("earnRatePctOfMargin"),
    holdbackDays: intField("holdbackDays"),
    expiryDays: intField("expiryDays"),
    maxRedeemPctOfOrder: numberField("maxRedeemPctOfOrder"),
  });
  if (!result.ok) {
    failTo("/admin/rewards", result.error.message);
  }

  revalidatePath("/admin/rewards");
  redirect("/admin/rewards?saved=1");
}

/** Runs the rewards maintenance jobs on demand (release holdbacks, expire credit). */
export async function runRewardsMaintenanceAction(): Promise<void> {
  await requireOperator();

  const released = await makeReleaseDueRewards().execute();
  const expired = await makeExpireRewards().execute();
  // Retention passes: demote lapsed customers (RFM) and send win-back incentives.
  await makeRecalculateSegments().execute();
  await makeGenerateWinBack().execute();
  const releasedCount = released.ok ? released.value.releasedCount : 0;
  const expiredCount = expired.ok ? expired.value.expiredCount : 0;

  revalidatePath("/admin/rewards");
  redirect(`/admin/rewards?released=${releasedCount}&expired=${expiredCount}`);
}

/** Creates or updates a coupon from the admin form (hidden `id` ⇒ update). */
export async function saveCouponAction(formData: FormData): Promise<void> {
  await requireOperator();

  const id = String(formData.get("id") ?? "").trim();
  const backPath = id ? `/admin/coupons/${id}` : "/admin/coupons/new";

  const discountType = String(formData.get("discountType") ?? "");
  const rawValue = Number.parseFloat(String(formData.get("value") ?? "").replace(",", "."));
  if (!Number.isFinite(rawValue) || rawValue < 0) {
    failTo(backPath, "El valor del descuento debe ser un número no negativo.");
  }
  // Percentage is a whole percent; a fixed amount is entered in dollars.
  const value =
    discountType === "fixed" ? Math.round(rawValue * 100) : Math.round(rawValue);

  const minSpendRaw = String(formData.get("minSpend") ?? "").trim().replace(",", ".");
  const minSpend = minSpendRaw === "" ? 0 : Number.parseFloat(minSpendRaw);
  if (!Number.isFinite(minSpend) || minSpend < 0) {
    failTo(backPath, "El mínimo de compra debe ser un número no negativo.");
  }

  const usageRaw = String(formData.get("usageLimit") ?? "").trim();
  const usageLimitPerCustomer = usageRaw === "" ? null : Number.parseInt(usageRaw, 10);

  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  const expiresAt = expiresRaw === "" ? null : `${expiresRaw}T23:59:59.999Z`;

  const segmentRaw = String(formData.get("segmentScope") ?? "").trim();
  const segmentScope = segmentRaw === "" ? null : segmentRaw;

  const input = {
    code: String(formData.get("code") ?? ""),
    discountType,
    value,
    minSpendCents: Math.round(minSpend * 100),
    usageLimitPerCustomer,
    segmentScope,
    expiresAt,
    active: formData.get("active") === "on",
  };

  const result = id
    ? await makeUpdateCoupon().execute({ id, ...input })
    : await makeCreateCoupon().execute(input);
  if (!result.ok) {
    failTo(backPath, result.error.message);
  }

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

/** Deletes a coupon (operator action; prefer deactivating a shared one). */
export async function deleteCouponAction(id: string): Promise<void> {
  await requireOperator();

  const result = await makeDeleteCoupon().execute({ id });
  if (!result.ok) {
    failTo("/admin/coupons", result.error.message);
  }
  revalidatePath("/admin/coupons");
}

/** Raises a fraud alert against the referral of the customer behind an email. */
export async function raiseFraudAlertAction(formData: FormData): Promise<void> {
  await requireOperator();

  const email = String(formData.get("email") ?? "");
  const evidence = String(formData.get("evidence") ?? "");

  const resolved = await makeResolveUserByEmail().execute({ email });
  if (!resolved.ok) {
    failTo("/admin/fraude", `No existe una cuenta registrada con "${email}".`);
  }

  const result = await makeRaiseFraudAlert().execute({
    subjectType: "referral",
    subjectId: resolved.value.uid,
    signal: "manual",
    evidence,
  });
  if (!result.ok) {
    failTo("/admin/fraude", result.error.message);
  }

  revalidatePath("/admin/fraude");
  redirect("/admin/fraude?raised=1");
}

/** Resolves a fraud alert (approve clears it; block blocks the referral, audited). */
export async function resolveFraudAlertAction(
  alertId: string,
  verdict: "approve" | "block"
): Promise<void> {
  const viewer = await requireOperator();

  const result = await makeResolveFraudAlert().execute({
    alertId,
    verdict,
    operatorId: viewer.uid ?? "operator",
  });
  if (!result.ok) {
    failTo("/admin/fraude", result.error.message);
  }
  revalidatePath("/admin/fraude");
}

/** Applies a manual wallet credit/debit to the customer behind an email (audited). */
export async function adjustBalanceAction(formData: FormData): Promise<void> {
  const viewer = await requireOperator();

  const email = String(formData.get("email") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const amount = Number.parseFloat(String(formData.get("amount") ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0) {
    failTo(
      "/admin/rewards",
      "El monto debe ser distinto de cero (en dólares; usa negativo para debitar)."
    );
  }

  const resolved = await makeResolveUserByEmail().execute({ email });
  if (!resolved.ok) {
    failTo("/admin/rewards", `No existe una cuenta registrada con "${email}".`);
  }

  const result = await makeAdjustBalanceManually().execute({
    operatorId: viewer.uid ?? "operator",
    customerUid: resolved.value.uid,
    amountCents: Math.round(amount * 100),
    reason,
  });
  if (!result.ok) {
    failTo("/admin/rewards", result.error.message);
  }

  revalidatePath("/admin/rewards");
  redirect("/admin/rewards?adjusted=" + encodeURIComponent(resolved.value.email));
}
