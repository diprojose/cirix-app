import type {
  CapturedCommercialLeadDto,
  CommercialLeadInput,
  NormalizedCommercialLeadInput,
} from "../dtos/commercial-lead-dto";
import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import {
  CrmLeadSyncFailedError,
  InvalidCommercialLeadError,
} from "../../domain/errors/crm-errors";
import type { CommercialLeadSyncRepository } from "../../domain/repositories/commercial-lead-sync-repository";
import type { ZohoLeadsGateway } from "../../domain/repositories/zoho-leads-gateway";

export class CaptureCommercialLead
  implements UseCase<CommercialLeadInput, CapturedCommercialLeadDto>
{
  constructor(
    private readonly leads: CommercialLeadSyncRepository,
    private readonly zoho: ZohoLeadsGateway
  ) {}

  async execute(
    input: CommercialLeadInput
  ): Promise<Result<CapturedCommercialLeadDto, DomainError>> {
    const normalized = normalize(input);
    if (!normalized.ok) {
      return normalized;
    }

    const submittedAt = new Date().toISOString();
    const phoneDigits = digitsOnly(normalized.value.phone);
    const existing = await this.leads.findLatestByContact(normalized.value.email, phoneDigits);
    const zohoPayload = toZohoPayload(normalized.value);
    const record = await this.leads.createPending({
      normalizedLead: normalized.value,
      phoneDigits,
      submittedAt,
      zohoPayload,
    });

    try {
      const synced = await this.zoho.upsertLead({
        existingZohoLeadId: existing?.zohoLeadId,
        lead: normalized.value,
      });
      const syncedAt = new Date().toISOString();
      await this.leads.markSynced(record.id, synced.zohoLeadId, syncedAt);
      return ok({
        id: record.id,
        syncStatus: "synced",
        zohoLeadId: synced.zohoLeadId,
        submittedAt: record.submittedAt,
        syncedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Zoho sync failure";
      await this.leads.markFailed(record.id, message);
      return err(new CrmLeadSyncFailedError(message));
    }
  }
}

function normalize(
  input: CommercialLeadInput
): Result<NormalizedCommercialLeadInput, DomainError> {
  if (!input || typeof input !== "object" ||
      ["fullName", "phone", "source"].some((key) => typeof input[key as keyof CommercialLeadInput] !== "string") ||
      ["email", "company", "message", "campaign", "interestCategory", "locale"].some((key) => {
        const value = input[key as keyof CommercialLeadInput];
        return value !== undefined && typeof value !== "string";
      })) {
    return err(new InvalidCommercialLeadError("Invalid lead fields."));
  }
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const source = input.source.trim();
  const email = normalizeOptional(input.email)?.toLowerCase() ?? null;
  const company = normalizeOptional(input.company);
  const message = normalizeOptional(input.message);
  const campaign = normalizeOptional(input.campaign);
  const interestCategory = normalizeOptional(input.interestCategory);
  const locale = normalizeOptional(input.locale);

  if (fullName.length < 2) {
    return err(new InvalidCommercialLeadError("Lead name is required."));
  }
  if ((!phone && !email) || (phone && digitsOnly(phone).length < 7)) {
    return err(new InvalidCommercialLeadError("Lead phone is required."));
  }
  if (!source) {
    return err(new InvalidCommercialLeadError("Lead source is required."));
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err(new InvalidCommercialLeadError("Lead email is invalid."));
  }

  return ok({
    fullName,
    phone,
    email,
    company,
    message,
    source,
    campaign,
    interestCategory,
    locale,
  });
}

function normalizeOptional(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function toZohoPayload(lead: NormalizedCommercialLeadInput): Record<string, unknown> {
  return {
    Last_Name: deriveLastName(lead.fullName),
    First_Name: deriveFirstName(lead.fullName),
    Full_Name_Web: lead.fullName,
    ...(lead.phone ? { Phone: lead.phone } : {}),
    Email: lead.email,
    Lead_Source: lead.source,
    Description: lead.message,
    Company: lead.company || "Cirix Tech Platform web inquiry",
    Campaign_Name_Web: lead.campaign,
    Interest_Category_Web: lead.interestCategory,
    Locale_Web: lead.locale,
  };
}

function deriveFirstName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return parts[0] ?? fullName;
}

function deriveLastName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return parts.slice(1).join(" ") || parts[0] || "Web Lead";
}
