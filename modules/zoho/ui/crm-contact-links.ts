import type { CommercialContactDto, LifecycleStage } from "../crm/application/dtos/crm-dashboard-dto";

const SEGMENTS: Record<LifecycleStage, string> = {
  subscriber: "subscribers",
  lead: "leads",
  prospect: "prospects",
  customer: "customers",
};

export function stageHref(stage: LifecycleStage) {
  return `/zoho/${SEGMENTS[stage]}`;
}

export function contactHref(contact: CommercialContactDto) {
  return `${stageHref(contact.lifecycleStage)}/${encodeURIComponent(contact.id)}`;
}

export function stageFromSegment(segment: string): LifecycleStage | null {
  return (Object.keys(SEGMENTS) as LifecycleStage[]).find((stage) => SEGMENTS[stage] === segment) ?? null;
}
