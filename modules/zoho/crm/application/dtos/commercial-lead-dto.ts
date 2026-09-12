export type CommercialLeadInput = {
  fullName: string;
  phone: string;
  email?: string;
  company?: string;
  message?: string;
  source: string;
  campaign?: string;
  interestCategory?: string;
  locale?: string;
};

export type NormalizedCommercialLeadInput = Omit<
  CommercialLeadInput,
  "email" | "company" | "message" | "campaign" | "interestCategory" | "locale"
> & {
  email: string | null;
  company: string | null;
  message: string | null;
  campaign: string | null;
  interestCategory: string | null;
  locale: string | null;
};

export type StoredCommercialLead = {
  id: string;
  fullName: string;
  phone: string;
  phoneDigits: string;
  email: string | null;
  company: string | null;
  message: string | null;
  source: string;
  campaign: string | null;
  interestCategory: string | null;
  locale: string | null;
  submittedAt: string;
  syncStatus: "pending" | "synced" | "failed";
  syncAttempts: number;
  zohoLeadId: string | null;
  zohoPayload: Record<string, unknown>;
  lastError: string | null;
  syncedAt: string | null;
};

export type CapturedCommercialLeadDto = {
  id: string;
  syncStatus: "pending" | "synced" | "failed";
  zohoLeadId: string | null;
  submittedAt: string;
  syncedAt: string | null;
};
