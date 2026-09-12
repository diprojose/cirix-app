export type LifecycleStage = "subscriber" | "lead" | "prospect" | "customer";

export type QualificationStatus = "new" | "contacted" | "qualified" | "unqualified";

export type SubscriptionStatus = "subscribed" | "unsubscribed";

export type OpportunityStatus = "open" | "won" | "lost";

export type CommercialContactDto = {
  id: string;
  externalCrmId: string;
  externalModule: "lead" | "contact" | "subscriber_source";
  fullName: string;
  phone: string;
  email: string;
  companyName: string | null;
  source: string;
  owner: string;
  lifecycleStage: LifecycleStage;
  qualificationStatus: QualificationStatus | null;
  subscriptionStatus: SubscriptionStatus | null;
  interestCategory: string | null;
  nextAction: string | null;
  description?: string | null;
  lastActivityAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityDto = {
  id: string;
  externalCrmId: string;
  contactId: string;
  title: string;
  stage: string;
  value: number | null;
  expectedCloseDate: string | null;
  owner: string;
  status: OpportunityStatus;
};

export type ActivityDto = {
  id: string;
  contactId: string;
  kind: "form" | "note" | "task" | "call" | "message" | "deal";
  summary: string;
  happenedAt: string;
};

export type StageSummaryDto = {
  stage: LifecycleStage;
  label: string;
  count: number;
  note: string;
};

export type ConversionSummaryDto = {
  label: string;
  value: string;
  note: string;
};

export type PriorityFollowUpDto = {
  contactId: string;
  fullName: string;
  lifecycleStage: LifecycleStage;
  owner: string;
  source: string;
  nextAction: string;
  dueLabel: string;
};

export type CrmDashboardDto = {
  contacts: CommercialContactDto[];
  opportunities: OpportunityDto[];
  activities: ActivityDto[];
  stageSummary: StageSummaryDto[];
  conversions: ConversionSummaryDto[];
  priorityFollowUps: PriorityFollowUpDto[];
};
