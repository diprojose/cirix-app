import type { CrmDashboardDto } from "@/modules/crm/application/dtos/crm-dashboard-dto";
import { CrmUnavailableError } from "@/modules/crm/domain/errors/crm-errors";
import { makeGetCrmDashboard } from "@/modules/crm/infrastructure/di/crm-container";

export type ZohoDashboardState = {
  dashboard: CrmDashboardDto;
  warning: string | null;
};

const EMPTY_DASHBOARD: CrmDashboardDto = {
  contacts: [],
  opportunities: [],
  activities: [],
  stageSummary: [
    {
      stage: "subscriber",
      label: "Subscribers",
      count: 0,
      note: "Audience captured for nurture and promotional consent.",
    },
    {
      stage: "lead",
      label: "Leads",
      count: 0,
      note: "Inbound commercial inquiries waiting for qualification.",
    },
    {
      stage: "prospect",
      label: "Prospects",
      count: 0,
      note: "Qualified accounts that need disciplined follow-up.",
    },
    {
      stage: "customer",
      label: "Customers",
      count: 0,
      note: "Won business already inside the relationship base.",
    },
  ],
  conversions: [
    {
      label: "Subscriber to lead",
      value: "0%",
      note: "People who moved from passive audience to commercial intent.",
    },
    {
      label: "Lead to prospect",
      value: "0%",
      note: "Qualified accounts after sales triage.",
    },
    {
      label: "Prospect to customer",
      value: "0%",
      note: "Closed business against the active pipeline.",
    },
    {
      label: "Won deals",
      value: "0",
      note: "Deals already marked as won in the CRM feed.",
    },
  ],
  priorityFollowUps: [],
};

export async function getZohoDashboardState(): Promise<ZohoDashboardState> {
  const result = await makeGetCrmDashboard().execute();
  if (result.ok) {
    return {
      dashboard: result.value,
      warning: null,
    };
  }

  if (shouldUseFallback(result.error)) {
    return {
      dashboard: EMPTY_DASHBOARD,
      warning: result.error.message,
    };
  }

  throw result.error;
}

export async function getZohoDashboard(): Promise<CrmDashboardDto> {
  const { dashboard } = await getZohoDashboardState();
  return dashboard;
}

function shouldUseFallback(error: unknown): error is CrmUnavailableError {
  return error instanceof CrmUnavailableError && error.message.includes("temporarily paused after rate limiting");
}
