import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CrmReadModel } from "../../domain/repositories/crm-read-model";
import type {
  CommercialContactDto,
  CrmDashboardDto,
  LifecycleStage,
  OpportunityDto,
  PriorityFollowUpDto,
  StageSummaryDto,
} from "../dtos/crm-dashboard-dto";

const STAGE_ORDER: LifecycleStage[] = ["subscriber", "lead", "prospect", "customer"];

const STAGE_LABELS: Record<LifecycleStage, string> = {
  subscriber: "Subscribers",
  lead: "Leads",
  prospect: "Prospects",
  customer: "Customers",
};

const STAGE_NOTES: Record<LifecycleStage, string> = {
  subscriber: "Audience captured for nurture and promotional consent.",
  lead: "Inbound commercial inquiries waiting for qualification.",
  prospect: "Qualified accounts that need disciplined follow-up.",
  customer: "Won business already inside the relationship base.",
};

export class GetCrmDashboard implements UseCase<void, CrmDashboardDto> {
  constructor(private readonly crm: CrmReadModel) {}

  async execute(): Promise<Result<CrmDashboardDto, DomainError>> {
    const [contacts, opportunities, activities] = await Promise.all([
      this.crm.listCommercialContacts(),
      this.crm.listOpportunities(),
      this.crm.listActivities(),
    ]);

    return ok({
      contacts,
      opportunities,
      activities,
      stageSummary: summarizeStages(contacts),
      conversions: summarizeConversions(contacts, opportunities),
      priorityFollowUps: buildPriorityFollowUps(contacts),
    });
  }
}

function summarizeStages(contacts: CommercialContactDto[]): StageSummaryDto[] {
  return STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: contacts.filter((contact) => contact.lifecycleStage === stage).length,
    note: STAGE_NOTES[stage],
  }));
}

function summarizeConversions(
  contacts: CommercialContactDto[],
  opportunities: OpportunityDto[]
): CrmDashboardDto["conversions"] {
  const subscribers = contacts.filter((contact) => contact.lifecycleStage === "subscriber").length;
  const leads = contacts.filter((contact) => contact.lifecycleStage === "lead").length;
  const prospects = contacts.filter((contact) => contact.lifecycleStage === "prospect").length;
  const customers = contacts.filter((contact) => contact.lifecycleStage === "customer").length;
  const wonDeals = opportunities.filter((opportunity) => opportunity.status === "won").length;

  return [
    {
      label: "Subscriber to lead",
      value: ratio(leads, subscribers),
      note: "People who moved from passive audience to commercial intent.",
    },
    {
      label: "Lead to prospect",
      value: ratio(prospects, leads),
      note: "Qualified accounts after sales triage.",
    },
    {
      label: "Prospect to customer",
      value: ratio(customers, prospects),
      note: "Closed business against the active pipeline.",
    },
    {
      label: "Won deals",
      value: `${wonDeals}`,
      note: "Deals already marked as won in the CRM feed.",
    },
  ];
}

function buildPriorityFollowUps(contacts: CommercialContactDto[]): PriorityFollowUpDto[] {
  return contacts
    .filter((contact) => contact.nextAction)
    .map((contact) => ({
      contactId: contact.id,
      fullName: contact.fullName,
      lifecycleStage: contact.lifecycleStage,
      owner: contact.owner,
      source: contact.source,
      nextAction: contact.nextAction ?? "",
      dueLabel: relativeRecency(contact.lastActivityAt),
    }))
    .sort((left, right) => comparePriority(left, right))
    .slice(0, 5);
}

function comparePriority(left: PriorityFollowUpDto, right: PriorityFollowUpDto): number {
  return stagePriority(left.lifecycleStage) - stagePriority(right.lifecycleStage);
}

function stagePriority(stage: LifecycleStage): number {
  switch (stage) {
    case "prospect":
      return 0;
    case "lead":
      return 1;
    case "subscriber":
      return 2;
    case "customer":
      return 3;
  }
}

function relativeRecency(lastActivityAt: string | null): string {
  if (!lastActivityAt) {
    return "No activity yet";
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(lastActivityAt)) / msPerDay));
  if (days === 0) {
    return "Active today";
  }
  if (days === 1) {
    return "Last activity 1 day ago";
  }
  return `Last activity ${days} days ago`;
}

function ratio(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return "0%";
  }
  return `${Math.round((numerator / denominator) * 100)}%`;
}
