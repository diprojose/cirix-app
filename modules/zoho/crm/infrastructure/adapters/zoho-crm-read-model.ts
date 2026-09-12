import "server-only";
import type {
  ActivityDto,
  CommercialContactDto,
  OpportunityDto,
  QualificationStatus,
  SubscriptionStatus,
} from "../../application/dtos/crm-dashboard-dto";
import type { CrmReadModel } from "../../domain/repositories/crm-read-model";
import { ZohoCrmClient, type ZohoCrmRecord } from "./zoho-crm-client";

type Snapshot = {
  contacts: CommercialContactDto[];
  opportunities: OpportunityDto[];
  activities: ActivityDto[];
};

const LEAD_FIELDS = [
  "id",
  "Full_Name",
  "First_Name",
  "Last_Name",
  "Phone",
  "Mobile",
  "Email",
  "Company",
  "Lead_Source",
  "Lead_Status",
  "Description",
  "Next_Step",
  "Owner",
  "Tag",
  "Created_Time",
  "Modified_Time",
  "Last_Activity_Time",
  "Converted",
  "Converted_Time",
  "Email_Opt_Out",
];

const CONTACT_FIELDS = [
  "id",
  "Full_Name",
  "First_Name",
  "Last_Name",
  "Phone",
  "Mobile",
  "Email",
  "Account_Name",
  "Lead_Source",
  "Description",
  "Next_Step",
  "Owner",
  "Tag",
  "Created_Time",
  "Modified_Time",
  "Last_Activity_Time",
  "Email_Opt_Out",
];

const DEAL_FIELDS = [
  "id",
  "Deal_Name",
  "Stage",
  "Amount",
  "Closing_Date",
  "Owner",
  "Contact_Name",
  "Account_Name",
  "Lead_Source",
  "Created_Time",
  "Modified_Time",
];

const TASK_FIELDS = ["id", "Subject", "Description", "Owner", "Who_Id", "What_Id", "Created_Time", "Modified_Time", "Due_Date"];
const CALL_FIELDS = [
  "id",
  "Subject",
  "Call_Type",
  "Call_Start_Time",
  "Description",
  "Owner",
  "Who_Id",
  "What_Id",
  "Created_Time",
  "Modified_Time",
];
const NOTE_FIELDS = ["id", "Note_Title", "Note_Content", "Parent_Id", "Created_Time", "Modified_Time"];

export class ZohoCrmReadModel implements CrmReadModel {
  private snapshotPromise: Promise<Snapshot> | null = null;

  constructor(private readonly client: ZohoCrmClient) {}

  async listCommercialContacts(): Promise<CommercialContactDto[]> {
    return (await this.loadSnapshot()).contacts;
  }

  async listOpportunities(): Promise<OpportunityDto[]> {
    return (await this.loadSnapshot()).opportunities;
  }

  async listActivities(): Promise<ActivityDto[]> {
    return (await this.loadSnapshot()).activities;
  }

  private async loadSnapshot(): Promise<Snapshot> {
    if (!this.snapshotPromise) {
      this.snapshotPromise = this.buildSnapshot().finally(() => {
        this.snapshotPromise = null;
      });
    }

    return this.snapshotPromise;
  }

  private async buildSnapshot(): Promise<Snapshot> {
    const [rawLeads, rawContacts, rawDeals, taskRecords, callRecords, noteRecords] = await Promise.all([
      this.client.listModule("Leads", { fields: LEAD_FIELDS }),
      this.client.listModule("Contacts", { fields: CONTACT_FIELDS }),
      this.client.listModule("Deals", { fields: DEAL_FIELDS }),
      this.optionalModule("Tasks", TASK_FIELDS),
      this.optionalModule("Calls", CALL_FIELDS),
      this.optionalModule("Notes", NOTE_FIELDS),
    ]);

    const normalizedContacts = rawContacts.map((record) => normalizeContactRecord(record));
    const customerFingerprints = new Set<string>(
      normalizedContacts.flatMap((record) =>
        [fingerprintEmail(record.email), fingerprintPhone(record.phone)].filter((value): value is string => Boolean(value))
      )
    );

    const opportunities = rawDeals.map((record) => normalizeOpportunity(record));
    const dealExternalIds = new Set(
      opportunities
        .map((opportunity) => stripPrefix(opportunity.contactId))
        .filter((value): value is string => Boolean(value))
    );

    const normalizedLeads = rawLeads
      .map((record) => normalizeLeadRecord(record, dealExternalIds))
      .filter((record) => !record.converted && !matchesKnownCustomer(record.contact, customerFingerprints))
      .map((record) => record.contact);

    const contacts = [...normalizedLeads, ...normalizedContacts];
    const contactsByExternalId = new Map<string, string>(contacts.map((record) => [record.externalCrmId, record.id]));
    const hydratedOpportunities = opportunities.map((opportunity) => ({
      ...opportunity,
      contactId: contactsByExternalId.get(stripPrefix(opportunity.contactId) ?? "") ?? opportunity.contactId,
    }));

    const activities = [
      ...taskRecords.map((record) => normalizeTaskActivity(record, contactsByExternalId)),
      ...callRecords.map((record) => normalizeCallActivity(record, contactsByExternalId)),
      ...noteRecords.map((record) => normalizeNoteActivity(record, contactsByExternalId)),
    ]
      .filter((record): record is ActivityDto => record !== null)
      .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt))
      .slice(0, 50);

    return {
      contacts: contacts.sort(compareContacts),
      opportunities: hydratedOpportunities.sort(compareOpportunities),
      activities,
    };
  }

  private async optionalModule(moduleName: string, fields: string[]): Promise<ZohoCrmRecord[]> {
    try {
      return await this.client.listModule(moduleName, { fields, maxPages: 5 });
    } catch {
      return [];
    }
  }
}

function normalizeLeadRecord(record: ZohoCrmRecord, dealExternalIds: Set<string>) {
  const externalId = readId(record);
  const source = readSource(record);
  const description = readString(record.Description);
  const tagNames = readTagNames(record.Tag);
  const lowerSignals = [source, description, ...tagNames].filter(Boolean).join(" ").toLowerCase();
  const qualificationStatus = inferQualificationStatus(readString(record.Lead_Status), lowerSignals);
  const lifecycleStage = inferLeadStage({
    externalId,
    source,
    lowerSignals,
    qualificationStatus,
    hasDeal: dealExternalIds.has(externalId),
  });

  return {
    converted: readBoolean(record.Converted),
    contact: {
      id: `lead:${externalId}`,
      externalCrmId: externalId,
      externalModule: lifecycleStage === "subscriber" ? "subscriber_source" : "lead",
      fullName: readFullName(record),
      phone: readPhone(record),
      email: readString(record.Email) ?? "",
      companyName: readString(record.Company),
      source,
      owner: readOwnerName(record.Owner),
      lifecycleStage,
      qualificationStatus,
      subscriptionStatus: inferSubscriptionStatus(record, lifecycleStage),
      interestCategory: firstNonEmpty(tagNames[0], deriveInterestCategory(source, description)),
      nextAction: inferNextAction(record),
      description,
      lastActivityAt: readIso(record.Last_Activity_Time) ?? readIso(record.Modified_Time),
      convertedAt: readIso(record.Converted_Time),
      createdAt: readRequiredIso(record.Created_Time, record.Modified_Time),
      updatedAt: readRequiredIso(record.Modified_Time, record.Created_Time),
    } satisfies CommercialContactDto,
  };
}

function normalizeContactRecord(record: ZohoCrmRecord): CommercialContactDto {
  const externalId = readId(record);
  const source = readSource(record);
  const description = readString(record.Description);
  const tagNames = readTagNames(record.Tag);

  return {
    id: `contact:${externalId}`,
    externalCrmId: externalId,
    externalModule: "contact",
    fullName: readFullName(record),
    phone: readPhone(record),
    email: readString(record.Email) ?? "",
    companyName: readNestedString(record.Account_Name, "name"),
    source,
    owner: readOwnerName(record.Owner),
    lifecycleStage: "customer",
    qualificationStatus: "qualified",
    subscriptionStatus: inferSubscriptionStatus(record, "customer"),
    interestCategory: firstNonEmpty(tagNames[0], deriveInterestCategory(source, description)),
    nextAction: inferNextAction(record),
    description,
    lastActivityAt: readIso(record.Last_Activity_Time) ?? readIso(record.Modified_Time),
    convertedAt: readIso(record.Created_Time),
    createdAt: readRequiredIso(record.Created_Time, record.Modified_Time),
    updatedAt: readRequiredIso(record.Modified_Time, record.Created_Time),
  };
}

function normalizeOpportunity(record: ZohoCrmRecord): OpportunityDto {
  const externalId = readId(record);
  const contactExternalId =
    readNestedString(record.Contact_Name, "id") ?? readNestedString(record.Account_Name, "id") ?? externalId;
  const stage = readString(record.Stage) ?? "Open";

  return {
    id: `deal:${externalId}`,
    externalCrmId: externalId,
    contactId: `crm:${contactExternalId}`,
    title: readString(record.Deal_Name) ?? `Deal ${externalId}`,
    stage,
    value: readNumber(record.Amount),
    expectedCloseDate: readDateLike(record.Closing_Date),
    owner: readOwnerName(record.Owner),
    status: inferOpportunityStatus(stage),
  };
}

function normalizeTaskActivity(
  record: ZohoCrmRecord,
  contactsByExternalId: Map<string, string>
): ActivityDto | null {
  const contactId = resolveActivityContactId(record, contactsByExternalId, ["Who_Id", "What_Id"]);
  if (!contactId) {
    return null;
  }

  return {
    id: `task:${readId(record)}`,
    contactId,
    kind: "task",
    summary: readString(record.Subject) ?? readString(record.Description) ?? "Task logged in Zoho",
    happenedAt: readRequiredIso(record.Modified_Time, record.Created_Time, record.Due_Date),
  };
}

function normalizeCallActivity(
  record: ZohoCrmRecord,
  contactsByExternalId: Map<string, string>
): ActivityDto | null {
  const contactId = resolveActivityContactId(record, contactsByExternalId, ["Who_Id", "What_Id"]);
  if (!contactId) {
    return null;
  }

  return {
    id: `call:${readId(record)}`,
    contactId,
    kind: "call",
    summary:
      readString(record.Subject) ??
      readString(record.Description) ??
      firstNonEmpty(readString(record.Call_Type), "Call logged in Zoho") ??
      "Call logged in Zoho",
    happenedAt: readRequiredIso(record.Call_Start_Time, record.Modified_Time, record.Created_Time),
  };
}

function normalizeNoteActivity(
  record: ZohoCrmRecord,
  contactsByExternalId: Map<string, string>
): ActivityDto | null {
  const contactId = resolveActivityContactId(record, contactsByExternalId, ["Parent_Id"]);
  if (!contactId) {
    return null;
  }

  return {
    id: `note:${readId(record)}`,
    contactId,
    kind: "note",
    summary: readString(record.Note_Title) ?? summarizeText(readString(record.Note_Content)) ?? "Zoho note added",
    happenedAt: readRequiredIso(record.Modified_Time, record.Created_Time),
  };
}

function resolveActivityContactId(
  record: ZohoCrmRecord,
  contactsByExternalId: Map<string, string>,
  candidateKeys: string[]
): string | null {
  for (const key of candidateKeys) {
    const externalId = readNestedString(record[key], "id") ?? readString(record[key]);
    if (externalId) {
      const match = contactsByExternalId.get(externalId);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function inferLeadStage(input: {
  externalId: string;
  source: string;
  lowerSignals: string;
  qualificationStatus: QualificationStatus | null;
  hasDeal: boolean;
}): CommercialContactDto["lifecycleStage"] {
  if (isSubscriberSignal(input.source, input.lowerSignals)) {
    return "subscriber";
  }

  if (input.hasDeal || input.qualificationStatus === "qualified") {
    return "prospect";
  }

  return "lead";
}

function inferQualificationStatus(status: string | null, lowerSignals: string): QualificationStatus | null {
  const normalized = `${status ?? ""} ${lowerSignals}`.toLowerCase();
  if (!normalized.trim()) {
    return null;
  }
  if (/(qualified|proposal|prospect|opportunity|negotiat)/.test(normalized)) {
    return "qualified";
  }
  if (/(junk|invalid|spam|unqualified|closed[- ]lost)/.test(normalized)) {
    return "unqualified";
  }
  if (/(contacted|attempted|follow[- ]?up|in progress|working)/.test(normalized)) {
    return "contacted";
  }
  return "new";
}

function inferSubscriptionStatus(
  record: ZohoCrmRecord,
  lifecycleStage: CommercialContactDto["lifecycleStage"]
): SubscriptionStatus | null {
  if (readBoolean(record.Email_Opt_Out)) {
    return "unsubscribed";
  }
  if (lifecycleStage === "subscriber") {
    return "subscribed";
  }
  return null;
}

function inferOpportunityStatus(stage: string): OpportunityDto["status"] {
  const normalized = stage.toLowerCase();
  if (/(won|closed won|success)/.test(normalized)) {
    return "won";
  }
  if (/(lost|closed lost|cancel)/.test(normalized)) {
    return "lost";
  }
  return "open";
}

function inferNextAction(record: ZohoCrmRecord): string | null {
  return firstNonEmpty(readString(record.Next_Step), summarizeText(readString(record.Description)));
}

function isSubscriberSignal(source: string, lowerSignals: string): boolean {
  const sourceText = source.toLowerCase();
  return /(newsletter|catalog|cat[aá]logo|download|promo|campaign|subscriber|suscrip|audience|opt[- ]?in)/.test(
    `${sourceText} ${lowerSignals}`
  );
}

function deriveInterestCategory(source: string, description: string | null): string | null {
  const text = `${source} ${description ?? ""}`.toLowerCase();
  if (!text.trim()) {
    return null;
  }
  if (/(closet|closets)/.test(text)) {
    return "Closets";
  }
  if (/(floor|piso|vinyl|vinil)/.test(text)) {
    return "Pisos";
  }
  if (/(furniture|mobiliario|office|corporativo)/.test(text)) {
    return "Mobiliario";
  }
  if (/(decor|deco)/.test(text)) {
    return "Decoracion";
  }
  return null;
}

function matchesKnownCustomer(record: CommercialContactDto, fingerprints: Set<string>): boolean {
  const email = fingerprintEmail(record.email);
  const phone = fingerprintPhone(record.phone);
  return Boolean((email && fingerprints.has(email)) || (phone && fingerprints.has(phone)));
}

function compareContacts(left: CommercialContactDto, right: CommercialContactDto): number {
  return Date.parse(right.lastActivityAt ?? right.updatedAt) - Date.parse(left.lastActivityAt ?? left.updatedAt);
}

function compareOpportunities(left: OpportunityDto, right: OpportunityDto): number {
  const leftDate = left.expectedCloseDate ? Date.parse(left.expectedCloseDate) : Number.MAX_SAFE_INTEGER;
  const rightDate = right.expectedCloseDate ? Date.parse(right.expectedCloseDate) : Number.MAX_SAFE_INTEGER;
  return leftDate - rightDate;
}

function readId(record: ZohoCrmRecord): string {
  return readString(record.id) ?? "unknown";
}

function readFullName(record: ZohoCrmRecord): string {
  return (
    readString(record.Full_Name) ??
    [readString(record.First_Name), readString(record.Last_Name)].filter(Boolean).join(" ").trim() ??
    readString(record.Company) ??
    "Unknown contact"
  );
}

function readPhone(record: ZohoCrmRecord): string {
  return firstNonEmpty(readString(record.Phone), readString(record.Mobile), "-") ?? "-";
}

function readSource(record: ZohoCrmRecord): string {
  return firstNonEmpty(readString(record.Lead_Source), "Zoho CRM") ?? "Zoho CRM";
}

function readOwnerName(value: unknown): string {
  return readNestedString(value, "name") ?? "Unassigned";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNestedString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return readString((value as Record<string, unknown>)[key]);
}

function readTagNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readNestedString(entry, "name"))
    .filter((entry): entry is string => Boolean(entry));
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function readIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function readDateLike(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value;
}

function readRequiredIso(...values: unknown[]): string {
  for (const value of values) {
    const iso = readIso(value);
    if (iso) {
      return iso;
    }
  }
  return new Date(0).toISOString();
}

function summarizeText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }
  return compact.length > 90 ? `${compact.slice(0, 87)}...` : compact;
}

function fingerprintEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email ? email : null;
}

function fingerprintPhone(value: string): string | null {
  const phone = value.replace(/\D/g, "");
  return phone ? phone : null;
}

function stripPrefix(value: string): string | null {
  const parts = value.split(":");
  return parts.length > 1 ? parts[parts.length - 1] ?? null : value;
}

function firstNonEmpty<T>(...values: Array<T | null | undefined | "">): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
}
