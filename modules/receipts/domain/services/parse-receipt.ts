/*
 * Turns the raw text an OCR engine read from a receipt into the few facts the
 * program needs. It is pure and knows nothing about who is asking. OCR makes
 * mistakes ("Merchant 10" for "Merchant ID", "T0TAL"), and receipts vary, so it
 * looks for labels loosely and leaves every judgement to verifyReceipt.
 *
 * The card number and everything else on the slip are deliberately not read.
 */

export type ParsedReceipt = {
  lines: string[];
  totalCents: number | null;
  /** The total also showed up elsewhere on the slip, or subtotal plus tax add up to it. */
  totalConfirmed: boolean;
  /** Every date on the slip as `YYYY-MM-DD`. `11/01/26` yields both readings: nothing on it says which one it is. */
  dates: string[];
  /** `HH:MM`, 24 hours, from the line holding the date. */
  time: string | null;
  transactionId: string | null;
  authCode: string | null;
  merchantId: string | null;
};

const AMOUNT = /(\d{1,3}(?:[.,\s]\d{3})+|\d+)\s?[.,]\s?(\d{2})(?!\d)/g;
const TOTAL_WORD = "T[O0]TAL";
const SUBTOTAL = new RegExp(`SUB\\s*-?\\s*${TOTAL_WORD}`);
const NOT_THE_TOTAL = new RegExp(`${TOTAL_WORD}\\s*(?:TAX|ITEM|ARTICULO|SAVING|DISCOUNT|DESCUENTO|IVA|IMPUESTO)`);
const GRAND_TOTAL = new RegExp(`(?:GRAND|GENERAL)\\s*${TOTAL_WORD}|${TOTAL_WORD}\\s*(?:DUE|A PAGAR|GENERAL)|BALANCE DUE`);
const TOTAL = new RegExp(`\\b${TOTAL_WORD}\\b`);
const SECONDARY_AMOUNT = /\b(?:AMOUNT|MONTO|IMPORTE|CREDIT CARD|DEBIT|TARJETA)\b/;
const TAX = /\b(?:TAX|IVA|ITBMS|IMPUESTO)\w*/;

// OCR turns the separator after a label into almost anything (":", "©", "~"), so anything goes.
const ID_SUFFIX = "[\\s.]*(?:#|NO\\b\\.?|NUM(?:BER|ERO)?\\b\\.?|NBR\\b\\.?|ID\\b)?[^A-Z0-9]*";
const ID_VALUE = "([A-Z0-9-]*\\d[A-Z0-9-]{2,})";
const TRANSACTION = new RegExp(`\\b(?:TRX|TRANS|TRANSACTION|TRANSACCION|TICKET|TKT|CHECK|CHK|ORDER|ORDEN|INVOICE|FACTURA|RECEIPT|RECIBO|FOLIO)\\b${ID_SUFFIX}${ID_VALUE}`);
const AUTHORIZATION = new RegExp(`\\b(?:AUTH|AUTHORIZATION|AUTORIZACION|APPR|APPROVAL|APROBACION)\\b${ID_SUFFIX}${ID_VALUE}`);
// "ID" is read as "1D", "I0" or "10" often enough that the label has to allow them.
const MERCHANT = /\b(?:MERCHANT|MERCH|MID|COMERCIO|AFILIADO)\b[\s.]*(?:ID|1D|I0|10|NO\b\.?|NUM\b\.?|#)?[^A-Z0-9*]*([*X\d-]{4,})/;

const DAY_OR_MONTH_FIRST = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g;
const YEAR_FIRST = /\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/g;
const CLOCK = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP])?\.?M?/;

/** Uppercase without accents, the form every pattern here is written against. */
const normalize = (line: string): string =>
  line.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();

function amountsIn(line: string): number[] {
  return [...line.matchAll(AMOUNT)].map(([, whole, cents]) => Number(whole.replace(/[.,\s]/g, "")) * 100 + Number(cents));
}

/** The amount on the line, or on the next one when the label sits alone. */
function amountFor(lines: string[], index: number): number | null {
  return amountsIn(lines[index]).at(-1) ?? (lines[index + 1] ? (amountsIn(lines[index + 1]).at(-1) ?? null) : null);
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function readDates(lines: string[]): string[] {
  const dates = new Set<string>();
  for (const line of lines) {
    for (const [, year, month, day] of line.matchAll(YEAR_FIRST)) {
      const date = isoDate(Number(year), Number(month), Number(day));
      if (date) dates.add(date);
    }
    for (const [, first, second, rawYear] of line.matchAll(DAY_OR_MONTH_FIRST)) {
      const year = Number(rawYear) + (rawYear.length === 2 ? 2000 : 0);
      for (const date of [isoDate(year, Number(first), Number(second)), isoDate(year, Number(second), Number(first))]) {
        if (date) dates.add(date);
      }
    }
  }
  return [...dates];
}

function readTime(lines: string[]): string | null {
  // Only next to a date: opening hours on the slip are clock times too.
  const line = lines.find((candidate) => candidate.search(DAY_OR_MONTH_FIRST) >= 0 || candidate.search(YEAR_FIRST) >= 0);
  const clock = line?.match(CLOCK);
  if (!clock) return null;
  let hours = Number(clock[1]);
  if (clock[3] === "P" && hours < 12) hours += 12;
  if (clock[3] === "A" && hours === 12) hours = 0;
  return hours < 24 && Number(clock[2]) < 60 ? `${String(hours).padStart(2, "0")}:${clock[2]}` : null;
}

function firstMatch(lines: string[], pattern: RegExp): string | null {
  for (const line of lines) {
    const value = line.match(pattern)?.[1];
    if (value) return value;
  }
  return null;
}

function readTotal(lines: string[]): { totalCents: number | null; totalConfirmed: boolean } {
  const grand: number[] = [];
  const totals: number[] = [];
  const secondary: number[] = [];
  let subtotal: number | null = null;
  let tax: number | null = null;

  lines.forEach((line, index) => {
    if (SUBTOTAL.test(line)) {
      subtotal ??= amountFor(lines, index);
      return;
    }
    if (TAX.test(line) && !TOTAL.test(line)) {
      tax ??= amountsIn(line).at(-1) ?? null;
      return;
    }
    if (NOT_THE_TOTAL.test(line)) return;
    const amount = amountFor(lines, index);
    if (amount === null) return;
    if (GRAND_TOTAL.test(line)) grand.push(amount);
    else if (TOTAL.test(line)) totals.push(amount);
    else if (SECONDARY_AMOUNT.test(line)) secondary.push(amount);
  });

  const candidates = grand.length > 0 ? grand : totals;
  if (candidates.length === 0) return { totalCents: null, totalConfirmed: false };
  // The most repeated labelled total, so one misread line cannot outvote the others; the larger on a tie.
  const totalCents = [...candidates].sort(
    (a, b) => candidates.filter((value) => value === b).length - candidates.filter((value) => value === a).length || b - a
  )[0];
  const seen = [...grand, ...totals, ...secondary].filter((amount) => amount === totalCents).length;
  const adds = subtotal !== null && tax !== null && subtotal + tax === totalCents;
  return { totalCents, totalConfirmed: seen >= 2 || adds };
}

/** The largest amount printed anywhere, for when no line was read as the total. */
export function largestAmount(lines: readonly string[]): number | null {
  const amounts = lines.flatMap(amountsIn);
  return amounts.length > 0 ? Math.max(...amounts) : null;
}

export function parseReceipt(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalize(line).trim())
    .filter((line) => line.length > 0);

  const merchant = firstMatch(lines, MERCHANT)?.replace(/[^\d]/g, "") ?? null;
  return {
    lines,
    ...readTotal(lines),
    dates: readDates(lines),
    time: readTime(lines),
    transactionId: firstMatch(lines, TRANSACTION),
    authCode: firstMatch(lines, AUTHORIZATION),
    merchantId: merchant !== null && merchant.length >= 4 ? merchant : null,
  };
}
