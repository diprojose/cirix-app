export const APPOINTMENT_STORAGE_KEY = "mixmag.n8n.appointments.v1";
export const APPOINTMENT_STORAGE_EVENT = "mixmag:n8n-appointments-changed";
export const COMPANY_TIME_ZONE = "America/New_York";
export const WORK_DAY_START = 9 * 60;
export const WORK_DAY_END = 17 * 60;

export type InvitationMode = "direct" | "proposal";
export type InvitationStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "expired"
  | "cancelled";

export type AppointmentSlot = {
  id: string;
  startsAt: string;
  durationMinutes: 30 | 45 | 60;
};

export type AppointmentInvitation = {
  id: string;
  token: string;
  mode: InvitationMode;
  status: InvitationStatus;
  customerName: string;
  customerEmail: string;
  subject: string;
  notes: string;
  timeZone: typeof COMPANY_TIME_ZONE;
  slots: AppointmentSlot[];
  selectedSlotId?: string;
  createdAt: string;
  expiresAt?: string;
};

export type AppointmentSnapshot = {
  version: 1;
  invitations: AppointmentInvitation[];
};

export type CreateInvitationInput = {
  mode: InvitationMode;
  customerName: string;
  customerEmail: string;
  subject: string;
  notes: string;
  slots: AppointmentSlot[];
};

const pad = (value: number) => String(value).padStart(2, "0");

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + days, 12);
  return localDateKey(date);
}

export function startOfWeek(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = date.getDay();
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return localDateKey(date);
}

export function weekday(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getDay();
}

export function slotMinutes(slot: AppointmentSlot): number {
  const time = slot.startsAt.slice(11, 16);
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function slotsOverlap(a: AppointmentSlot, b: AppointmentSlot): boolean {
  if (a.startsAt.slice(0, 10) !== b.startsAt.slice(0, 10)) return false;
  const aStart = slotMinutes(a);
  const bStart = slotMinutes(b);
  return aStart < bStart + b.durationMinutes && bStart < aStart + a.durationMinutes;
}

export function occupiedSlots(invitations: AppointmentInvitation[]): AppointmentSlot[] {
  return invitations.flatMap((invitation) => {
    if (invitation.status === "cancelled" || invitation.status === "declined" || invitation.status === "expired") return [];
    if (invitation.mode === "direct" && invitation.status === "pending") return invitation.slots.slice(0, 1);
    if (invitation.status === "confirmed") {
      return invitation.slots.filter((slot) => slot.id === invitation.selectedSlotId);
    }
    return [];
  });
}

export function isSlotAvailable(slot: AppointmentSlot, invitations: AppointmentInvitation[]): boolean {
  const day = weekday(slot.startsAt.slice(0, 10));
  const start = slotMinutes(slot);
  if (day === 0 || day === 6 || start < WORK_DAY_START || start + slot.durationMinutes > WORK_DAY_END) return false;
  return !occupiedSlots(invitations).some((occupied) => slotsOverlap(slot, occupied));
}

export function createInvitation(input: CreateInvitationInput): AppointmentInvitation {
  const now = new Date();
  const id = crypto.randomUUID();
  return {
    ...input,
    id,
    token: crypto.randomUUID().replaceAll("-", ""),
    status: "pending",
    timeZone: COMPANY_TIME_ZONE,
    selectedSlotId: input.mode === "direct" ? input.slots[0]?.id : undefined,
    createdAt: now.toISOString(),
    expiresAt: input.mode === "proposal" ? new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString() : undefined,
  };
}

export function withComputedExpiry(invitation: AppointmentInvitation, now = Date.now()): AppointmentInvitation {
  if (invitation.status === "pending" && invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= now) {
    return { ...invitation, status: "expired" };
  }
  return invitation;
}

export function readSnapshot(): AppointmentSnapshot {
  if (typeof window === "undefined") return { version: 1, invitations: [] };
  try {
    const raw = window.localStorage.getItem(APPOINTMENT_STORAGE_KEY);
    if (!raw) return { version: 1, invitations: [] };
    const parsed = JSON.parse(raw) as Partial<AppointmentSnapshot>;
    if (parsed.version !== 1 || !Array.isArray(parsed.invitations)) throw new Error("Invalid snapshot");
    return { version: 1, invitations: parsed.invitations.map((item) => withComputedExpiry(item)) };
  } catch {
    window.localStorage.removeItem(APPOINTMENT_STORAGE_KEY);
    return { version: 1, invitations: [] };
  }
}

export function writeInvitations(invitations: AppointmentInvitation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify({ version: 1, invitations } satisfies AppointmentSnapshot));
  window.dispatchEvent(new Event(APPOINTMENT_STORAGE_EVENT));
}

export function formatSlot(slot: AppointmentSlot, locale: "es" | "en", includeZone = true): string {
  const [date, time] = slot.startsAt.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  const formatted = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
  return includeZone ? `${formatted} · ${locale === "es" ? "hora de Florida" : "Florida time"}` : formatted;
}
