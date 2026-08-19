import {
  CALL_STATUSES,
  TERMINAL_CALL_STATUSES,
  mapTwilioStatus,
  type CallStatus,
  type TrackedCall,
} from "../domain/call";
import type {
  BusinessPhoneNumberRepository,
  CallRepository,
} from "../domain/call-repository";

const E164 = /^\+[1-9]\d{6,14}$/;

export type CallTrackingRuntimeConfig = {
  businessId: string;
  accountSid: string;
  trackingPhone: string | null;
  fallbackDestinationPhone: string | null;
  timeZone: string;
  trialMode: boolean;
};

export type IncomingTwilioCall = {
  callSid: string;
  accountSid: string;
  from: string;
  to: string;
  direction: string;
};

export type TwilioStatusEvent = {
  callSid: string;
  parentCallSid: string | null;
  callStatus: string;
  sequenceNumber: string | null;
  callDuration: string | null;
};

export type CallListFilters = {
  from: string | null;
  to: string | null;
  status: CallStatus | null;
  phone: string | null;
  page: number;
  limit: number;
};

export class CallTrackingService {
  constructor(
    private readonly calls: CallRepository,
    private readonly businessPhones: BusinessPhoneNumberRepository,
    private readonly config: CallTrackingRuntimeConfig,
    private readonly now: () => Date = () => new Date()
  ) {}

  async registerIncoming(input: IncomingTwilioCall): Promise<TrackedCall> {
    if (!input.callSid || input.accountSid !== this.config.accountSid) {
      throw new CallTrackingError("calls/invalid-account", "Invalid Twilio account or CallSid.");
    }
    assertE164(input.from, "From");
    assertE164(input.to, "To");
    if (input.direction !== "inbound") {
      throw new CallTrackingError("calls/invalid-direction", "Only inbound calls are accepted.");
    }

    const mapping = await this.businessPhones.findActive("twilio", input.to);
    const destination = mapping?.destinationPhone ?? this.resolveFallback(input.to);
    if (!destination) {
      throw new CallTrackingError("calls/destination-unavailable", "No active destination is configured.");
    }
    assertE164(destination, "destination");

    const now = this.now().toISOString();
    return this.calls.upsertIncoming(
      {
        businessId: mapping?.businessId ?? this.config.businessId,
        provider: "twilio",
        providerAccountId: input.accountSid,
        providerCallId: input.callSid,
        providerChildCallId: null,
        callerPhone: input.from,
        trackingPhone: input.to,
        destinationPhone: destination,
        direction: "inbound",
        status: "initiated",
        startedAt: now,
        ringingAt: null,
        answeredAt: null,
        endedAt: null,
        durationSeconds: null,
        lastSequenceNumber: null,
      },
      now
    );
  }

  async recordStatus(input: TwilioStatusEvent): Promise<TrackedCall | null> {
    const status = mapTwilioStatus(input.callStatus);
    if (!status || !input.callSid) {
      throw new CallTrackingError("calls/invalid-status", "Unsupported Twilio status event.");
    }
    return this.calls.applyStatusUpdate({
      provider: "twilio",
      parentCallId: input.parentCallSid,
      callId: input.callSid,
      status,
      sequenceNumber: parseNonNegativeInteger(input.sequenceNumber),
      durationSeconds: parseNonNegativeInteger(input.callDuration),
      occurredAt: this.now().toISOString(),
    });
  }

  async list(filters: CallListFilters) {
    const range = dateRange(filters.from, filters.to, this.config.timeZone);
    const all = (await this.calls.listByBusiness(this.config.businessId)).filter((call) => {
      const started = Date.parse(call.startedAt);
      return (
        (!range.from || started >= range.from.getTime()) &&
        (!range.toExclusive || started < range.toExclusive.getTime()) &&
        (!filters.status || call.status === filters.status) &&
        (!filters.phone || call.callerPhone === filters.phone)
      );
    });
    const start = (filters.page - 1) * filters.limit;
    return {
      data: all.slice(start, start + filters.limit),
      pagination: { page: filters.page, limit: filters.limit, total: all.length },
    };
  }

  async stats(from: string | null, to: string | null) {
    const listed = await this.list({ from, to, status: null, phone: null, page: 1, limit: 10_000 });
    const calls = listed.data;
    const uniqueCallers = new Set(calls.map((call) => call.callerPhone)).size;
    const answered = calls.filter((call) => call.answeredAt !== null);
    const missed = calls.filter(
      (call) => call.answeredAt === null && TERMINAL_CALL_STATUSES.has(call.status)
    );
    const durations = answered
      .map((call) => call.durationSeconds)
      .filter((duration): duration is number => duration !== null);
    return {
      totalCalls: calls.length,
      uniqueCallers,
      answeredCalls: answered.length,
      missedCalls: missed.length,
      repeatCalls: calls.length - uniqueCallers,
      answerRate: calls.length === 0 ? 0 : round(answered.length / calls.length * 100),
      averageDurationSeconds:
        durations.length === 0 ? 0 : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    };
  }

  async historyByPhone(phone: string) {
    assertE164(phone, "phone");
    const calls = (await this.calls.listByBusiness(this.config.businessId)).filter(
      (call) => call.callerPhone === phone
    );
    return {
      phone,
      totalCalls: calls.length,
      firstCallAt: calls.at(-1)?.startedAt ?? null,
      lastCallAt: calls.at(0)?.startedAt ?? null,
      calls,
    };
  }

  async findById(id: string) {
    const call = await this.calls.findById(id);
    return call?.businessId === this.config.businessId ? call : null;
  }

  private resolveFallback(trackingPhone: string): string | null {
    if (this.config.trackingPhone && trackingPhone !== this.config.trackingPhone) return null;
    return this.config.fallbackDestinationPhone;
  }
}

export class CallTrackingError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export function parseCallListFilters(url: URL): CallListFilters {
  const statusValue = url.searchParams.get("status");
  const status = CALL_STATUSES.includes(statusValue as CallStatus) ? statusValue as CallStatus : null;
  const page = clampInteger(url.searchParams.get("page"), 1, 100_000, 1);
  const limit = clampInteger(url.searchParams.get("limit"), 1, 100, 25);
  const phone = url.searchParams.get("phone") || null;
  if (phone) assertE164(phone, "phone");
  return { from: url.searchParams.get("from"), to: url.searchParams.get("to"), status, phone, page, limit };
}

export function defaultCallRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function assertE164(value: string, field: string): void {
  if (!E164.test(value)) {
    throw new CallTrackingError("calls/invalid-phone", `${field} must use E.164 format.`);
  }
}

function parseNonNegativeInteger(value: string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function clampInteger(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function dateRange(from: string | null, to: string | null, timeZone: string) {
  return {
    from: from ? zonedStartOfDay(from, timeZone, 0) : null,
    toExclusive: to ? zonedStartOfDay(to, timeZone, 1) : null,
  };
}

function zonedStartOfDay(date: string, timeZone: string, addDays: number): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) throw new CallTrackingError("calls/invalid-date", "Invalid date filter.");
    return parsed;
  }
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day + addDays);
  let guess = target;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second)
    );
    guess -= represented - target;
  }
  return new Date(guess);
}
