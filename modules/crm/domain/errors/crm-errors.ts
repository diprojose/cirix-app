import { DomainError } from "@/shared/domain/domain-error";

export class InvalidCommercialLeadError extends DomainError {
  readonly code = "crm/invalid-commercial-lead";
}

export class CrmLeadSyncFailedError extends DomainError {
  readonly code = "crm/lead-sync-failed";
}

export class CrmUnavailableError extends DomainError {
  readonly code = "crm/unavailable";
}
