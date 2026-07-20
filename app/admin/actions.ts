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

  const input = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    priceCents: Math.round(price * 100),
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
