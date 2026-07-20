import { NextResponse, type NextRequest } from "next/server";
import { formatPrice } from "@/lib/format/money";
import {
  makeReleaseDueRewards,
  makeExpireRewards,
  makeListExpiringSoon,
} from "@/modules/rewards/infrastructure/di/rewards-container";
import {
  makeRecalculateSegments,
  makeGenerateWinBack,
} from "@/modules/customers/infrastructure/di/customers-container";
import { makeSendNotification } from "@/modules/notifications/infrastructure/di/notifications-container";

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

  // Notifications: credit that just became available (US-H1), and credit about to
  // expire within a week (US-H2, deduped per line so reruns don't repeat it).
  if (released.ok) {
    for (const line of released.value.released) {
      await makeSendNotification().execute({
        customerUid: line.customerUid,
        type: "credit_available",
        title: "Crédito disponible",
        body: `Tienes ${formatPrice(line.amountCents, "USD")} de crédito listo para usar.`,
      });
    }
  }
  const expiring = await makeListExpiringSoon().execute({ withinDays: 7 });
  if (expiring.ok) {
    for (const line of expiring.value) {
      await makeSendNotification().execute({
        customerUid: line.customerUid,
        type: "credit_expiring",
        title: "Crédito por expirar",
        body: `${formatPrice(line.amountCents, "USD")} de tu crédito vence pronto.`,
        dedupeKey: `expiring_${line.entryId}`,
      });
    }
  }

  return NextResponse.json({
    releasedCount: released.ok ? released.value.releasedCount : null,
    expiredCount: expired.ok ? expired.value.expiredCount : null,
    resegmentedCount: resegmented.ok ? resegmented.value.updatedCount : null,
    winBackCount: winBack.ok ? winBack.value.sentCount : null,
  });
}
