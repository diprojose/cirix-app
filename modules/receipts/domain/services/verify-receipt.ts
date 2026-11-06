import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import {
  ReceiptAmountTooHighError,
  ReceiptOutOfDateError,
  ReceiptUnreadableError,
  ReceiptWrongStoreError,
  type ReceiptField,
} from "../errors/receipt-errors";
import type { ReceiptSettings } from "../value-objects/receipt-settings";
import type { ParsedReceipt } from "./parse-receipt";

/** A receipt that passed every check, with the keys that stop it being used twice. */
export type VerifiedReceipt = {
  totalCents: number;
  date: string;
  transactionId: string | null;
  merchantId: string | null;
  keys: string[];
};

const DAY_MS = 86_400_000;
/** Names this short match too much text to allow for OCR mistakes. */
const MIN_FUZZY_LENGTH = 5;
const MIN_SIMILARITY = 0.8;

const lettersAndDigits = (text: string): string =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** Whether the name appears in the line, tolerating the few letters OCR gets wrong. */
function lineNames(line: string, name: string): boolean {
  if (line.includes(name)) return true;
  if (name.length < MIN_FUZZY_LENGTH || line.length < name.length - 2) return false;
  const allowed = Math.floor(name.length * (1 - MIN_SIMILARITY));
  for (let start = 0; start <= Math.max(0, line.length - name.length); start += 1) {
    if (editDistance(line.slice(start, start + name.length), name) <= allowed) return true;
  }
  return false;
}

function isFromThisBusiness(parsed: ParsedReceipt, settings: ReceiptSettings, businessName: string): boolean {
  const { merchantId } = parsed;
  if (merchantId !== null && settings.merchantIds.length > 0) {
    // Slips often mask all but the last digits. A different number settles it: another store.
    return settings.merchantIds.some((id) => id.endsWith(merchantId) || merchantId.endsWith(id));
  }
  const names = (settings.storeNames.length > 0 ? settings.storeNames : [businessName]).map(lettersAndDigits).filter(Boolean);
  const lines = parsed.lines.map(lettersAndDigits);
  return names.some((name) => lines.some((line) => lineNames(line, name)));
}

/** The newest date on the slip inside the accepted window. Tomorrow counts: receipts carry local time, the server does not. */
function acceptedDate(dates: readonly string[], maxAgeDays: number, now: Date): string | null {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oldest = today - maxAgeDays * DAY_MS;
  const newest = today + DAY_MS;
  const inWindow = dates.filter((date) => Date.parse(date) >= oldest && Date.parse(date) <= newest);
  return [...inWindow].sort().at(-1) ?? null;
}

/** Characters OCR confuses collapse to one, so two photos of a slip produce the same key. */
const canonical = (value: string): string =>
  value
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/Z/g, "2")
    .replace(/G/g, "6");

/**
 * One key per identifier on the slip: a second photo may misread one of them,
 * and any key already taken means the receipt was used. The time is a last
 * resort, only when the slip has no number at all, because two customers can
 * pay the same amount in the same minute.
 */
function receiptKeys(parsed: ParsedReceipt, date: string, totalCents: number): string[] {
  const base = `${date}|${totalCents}`;
  const keys: string[] = [];
  if (parsed.transactionId !== null) keys.push(`trx|${canonical(parsed.transactionId)}|${base}`);
  if (parsed.authCode !== null) keys.push(`auth|${canonical(parsed.authCode)}|${base}`);
  if (keys.length === 0 && parsed.time !== null) keys.push(`time|${parsed.time}|${base}`);
  return keys;
}

/**
 * Decides whether a parsed receipt counts for this business. Pure. It cannot
 * tell a real slip from a well-made fake; docs/receipts.md says what bounds that.
 */
export function verifyReceipt(
  parsed: ParsedReceipt,
  settings: ReceiptSettings,
  businessName: string,
  now: Date
): Result<VerifiedReceipt, DomainError> {
  if (!isFromThisBusiness(parsed, settings, businessName)) return err(new ReceiptWrongStoreError());

  const missing: ReceiptField[] = [];
  if (parsed.totalCents === null) missing.push("total");
  if (parsed.dates.length === 0) missing.push("date");
  if (parsed.transactionId === null && parsed.authCode === null && parsed.time === null) missing.push("id");
  if (missing.length > 0 || parsed.totalCents === null) return err(new ReceiptUnreadableError(missing));

  const date = acceptedDate(parsed.dates, settings.maxAgeDays, now);
  if (date === null) return err(new ReceiptOutOfDateError(settings.maxAgeDays));

  const totalCents = parsed.totalCents;
  if (totalCents <= 0 || totalCents > settings.maxAmountDollars * 100) return err(new ReceiptAmountTooHighError());

  return ok({
    totalCents,
    date,
    transactionId: parsed.transactionId,
    merchantId: parsed.merchantId,
    keys: receiptKeys(parsed, date, totalCents),
  });
}
