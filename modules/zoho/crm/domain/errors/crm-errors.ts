import { DomainError } from "@/shared/domain/domain-error";

export class InvalidCommercialLeadError extends DomainError {
  readonly code = "crm/invalid-commercial-lead";
}

export class CrmLeadSyncFailedError extends DomainError {
  readonly code = "crm/lead-sync-failed";

  constructor(message: string, readonly leadId: string) {
    super(message);
  }
}

export class CrmUnavailableError extends DomainError {
  readonly code = "crm/unavailable";
}
