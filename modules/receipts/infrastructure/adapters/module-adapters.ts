import { makeGetCustomer, makeRecordCustomerEvent } from "@/modules/crm/infrastructure/di/crm-core-container";
import { makeGrantReceiptStamp } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";
import type { CustomerNames, ReceiptActivityLog, ReceiptCustomers, RedemptionActivityLog, StampRewards } from "../../domain/ports/receipt-ports";

/* The only place this module touches the CRM and the stamp card, through their own use cases. */

export class CrmReceiptCustomers implements ReceiptCustomers {
  async exists(businessId: string, userId: string): Promise<boolean> {
    return (await makeGetCustomer().execute({ businessId, userId })).ok;
  }
}

export class CrmReceiptActivityLog implements ReceiptActivityLog {
  async pointsEarned({ businessId, userId, eventId, points, balance, receiptId }: Parameters<ReceiptActivityLog["pointsEarned"]>[0]): Promise<void> {
    const result = await makeRecordCustomerEvent().execute({
      id: eventId,
      businessId,
      userId,
      type: "points_earned",
      data: { points, balance, receiptId },
    });
    if (!result.ok) throw new Error(result.error.code);
  }
}

export class CrmCustomerNames implements CustomerNames {
  async firstName(businessId: string, userId: string): Promise<string | null> {
    const customer = await makeGetCustomer().execute({ businessId, userId });
    return customer.ok ? (customer.value.name.split(" ")[0] ?? null) : null;
  }
}

export class CrmRedemptionActivityLog implements RedemptionActivityLog {
  async rewardRedeemed({ businessId, userId, eventId, rewardName, points }: Parameters<RedemptionActivityLog["rewardRedeemed"]>[0]): Promise<void> {
    const result = await makeRecordCustomerEvent().execute({
      id: eventId,
      businessId,
      userId,
      type: "reward_redeemed",
      data: { rewardName, points },
    });
    if (!result.ok) throw new Error(result.error.code);
  }
}

export class StampCardRewards implements StampRewards {
  check: StampRewards["check"] = (businessId, userId) => makeGrantReceiptStamp().check({ businessId, userId });
  grant: StampRewards["grant"] = (businessId, userId) => makeGrantReceiptStamp().execute({ businessId, userId });
}
