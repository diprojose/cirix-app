import { redirect } from "next/navigation";
import { localizeForCurrentRequest } from "@/lib/i18n";

/** The admin root simply lands on the order queue â€” the operator's home. */
export default async function AdminIndexPage() {
  redirect(await localizeForCurrentRequest("/admin/orders"));
}
