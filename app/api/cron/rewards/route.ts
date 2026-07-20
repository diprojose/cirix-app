import { NextResponse, type NextRequest } from "next/server";
import {
  makeReleaseDueRewards,
  makeExpireRewards,
} from "@/modules/rewards/infrastructure/di/rewards-container";
import {
  makeRecalculateSegments,
  makeGenerateWinBack,
} from "@/modules/customers/infrastructure/di/customers-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Scheduled daily maintenance for loyalty. Rewards: releases credit whose
 * holdback has elapsed (BR-02) and expires credit past its date (BR-04).
 * Retention: recomputes RFM segments so lapsed customers are demoted (BR-21) and
 * sends win-back incentives to the inactive (BR-17). Vercel Cron (see vercel.json)
 * calls this, sending `Authorization: Bearer $CRON_SECRET` — set the CRON_SECRET
 * env var so the header can be verified and the endpoint cannot be triggered by
 * the public. The operator can also run these from /admin/rewards. Every job is
 * idempotent, so overlapping runs are safe.
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
  const resegmented = await makeRecalculateSegments().execute();
  const winBack = await makeGenerateWinBack().execute();

  return NextResponse.json({
    releasedCount: released.ok ? released.value.releasedCount : null,
    expiredCount: expired.ok ? expired.value.expiredCount : null,
    resegmentedCount: resegmented.ok ? resegmented.value.updatedCount : null,
    winBackCount: winBack.ok ? winBack.value.sentCount : null,
  });
}
