import { redirect } from "next/navigation";

/** The admin root simply lands on the order queue — the operator's home. */
export default function AdminIndexPage() {
  redirect("/admin/orders");
}
