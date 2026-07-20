"use server";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { makeRequestPremiumUpgrade } from "@/modules/subscription/infrastructure/di/subscription-container";

/**
 * Records the signed-in user's premium request together with the payment
 * reference they report (first subscription and monthly renewal share this
 * flow). The operator verifies the reference and grants/extends the claim
 * from the admin panel.
 */
export async function requestPremiumAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.authenticated || !viewer.uid || !viewer.email) {
    redirect("/login?from=/premium");
  }

  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference") ?? "");

  const result = await makeRequestPremiumUpgrade().execute({
    uid: viewer.uid,
    email: viewer.email,
    payment: { method, reference },
  });

  if (!result.ok) {
    redirect(
      "/premium?error=" +
        encodeURIComponent("Revisa el método y la referencia del pago (mínimo 4 caracteres).")
    );
  }
  redirect("/premium?requested=1");
}
