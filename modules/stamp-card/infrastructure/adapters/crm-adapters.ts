import { makeGetCustomer, makeRecordCustomerEvent } from "@/modules/crm/infrastructure/di/crm-core-container";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { CustomerDirectory, CustomerSummary } from "../../domain/ports/customer-directory";

/**
 * Connects the stamp module to the CRM core. These two classes are the only
 * place the stamp module touches the CRM, through the CRM's own use cases, so
 * the CRM can change how it stores people without this module noticing.
 */
export class CrmCustomerDirectory implements CustomerDirectory {
  async find(businessId: string, userId: string): Promise<CustomerSummary | null> {
    const result = await makeGetCustomer().execute({ businessId, userId });
    if (!result.ok) return null;
    // Staff only ever see the first name of the person being stamped.
    return { firstName: result.value.name.split(" ")[0] };
  }
}

export class CrmActivityLog implements CustomerActivityLog {
  async record(input: Parameters<CustomerActivityLog["record"]>[0]): Promise<void> {
    const result = await makeRecordCustomerEvent().execute({
      id: input.eventId,
      businessId: input.businessId,
      userId: input.userId,
      type: input.type,
      data: input.data,
    });
    if (!result.ok) throw new Error(result.error.code);
  }
}
