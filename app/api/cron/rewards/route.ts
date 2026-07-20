import { NextResponse, type NextRequest } from "next/server";
import {
  makeReleaseDueRewards,
  makeExpireRewards,
} from "@/modules/rewards/infrastructure/di/rewards-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Scheduled maintenance for the rewards ledger: releases credit whose holdback
 * has elapsed (BR-02) and expires credit past its date (BR-04). Vercel Cron
 * (see vercel.json) calls this daily, sending `Authorization: Bearer $CRON_SECRET`
 * — set the CRON_SECRET env var in the project so the header can be verified and
 * the endpoint cannot be triggered by the public. The operator can also run the
 * same jobs on demand from /admin/rewards. Both paths share the use cases, and
 * every transition is idempotent, so overlapping runs are safe.
 */

/** True when the request carries the configured cron bearer secret. */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const released = await makeReleaseDueRewards().execute();
  const expired = await makeExpireRewards().execute();

  return NextResponse.json({
    releasedCount: released.ok ? released.value.releasedCount : null,
    expiredCount: expired.ok ? expired.value.expiredCount : null,
  });
}
