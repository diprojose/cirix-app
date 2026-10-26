import type { ReactNode } from "react";
import { requireBusinessAccess } from "@/lib/auth/business-access";

/**
 * The membership gate for EVERY page under /biz/<slug>. The proxy lets any
 * verified account reach this area, so this layout is what keeps outsiders out:
 * without a role in this business they get a 404. Pages below still check the
 * specific permission they need (for example `customers:read`).
 *
 * Do not add pages under /biz/<slug> that bypass this layout.
 */
export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireBusinessAccess(slug);
  return children;
}
