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
  /** The amount on a line labelled as the total. */
  totalCents: number | null;
  /**
   * The best guess when no total line was read: subtotal plus tax, the card
   * payment, or the cash handed over minus the change. Never the cash itself: a
   * $7.99 bill paid with a $10 note would read as $10.
   */
  fallbackTotalCents: number | null;
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
// Restaurant slips print a table of suggested tips, each row with its own "total".
const TIP = /\b(?:TIPS?|PROPINAS?|GRATUITY|GRATUIDAD|SUGGESTED|SUGERID[AO]S?)\b/;
const PERCENT_ROW = /^\W*\d{1,2}(?:[.,]\d+)?\s?%/;
// What the customer handed over and got back, never the amount of the sale.
const CHANGE = /\b(?:CHANGE|CAMBIO|VUELTO|VUELTA)\b/;
const TENDERED = /\b(?:CASH|EFECTIVO|TENDER(?:ED)?|RECIBIDO)\b/;

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

/** The amount seen most often, the larger on a tie, so one misread line cannot outvote the others. */
function mostRepeated(amounts: readonly number[]): number | null {
  if (amounts.length === 0) return null;
  const count = (value: number) => amounts.filter((amount) => amount === value).length;
  return [...amounts].sort((a, b) => count(b) - count(a) || b - a)[0];
}

function readTotal(lines: string[]): Pick<ParsedReceipt, "totalCents" | "totalConfirmed" | "fallbackTotalCents"> {
  const grand: number[] = [];
  const totals: number[] = [];
  const secondary: number[] = [];
  const unlabelled: number[] = [];
  let subtotal: number | null = null;
  let tax: number | null = null;
  let tendered: number | null = null;
  let change: number | null = null;

  lines.forEach((line, index) => {
    if (TIP.test(line) || PERCENT_ROW.test(line)) return;
    if (CHANGE.test(line)) {
      change ??= amountFor(lines, index);
      return;
    }
    if (TENDERED.test(line)) {
      tendered ??= amountFor(lines, index);
      return;
    }
    if (SUBTOTAL.test(line)) {
      subtotal ??= amountFor(lines, index);
      return;
    }
    if (TAX.test(line) && !TOTAL.test(line)) {
      tax ??= amountsIn(line).at(-1) ?? null;
      return;
    }
    if (NOT_THE_TOTAL.test(line)) return;
    const labelled = GRAND_TOTAL.test(line) ? grand : TOTAL.test(line) ? totals : SECONDARY_AMOUNT.test(line) ? secondary : null;
    if (labelled === null) {
      unlabelled.push(...amountsIn(line));
      return;
    }
    const amount = amountFor(lines, index);
    if (amount !== null) labelled.push(amount);
  });

  const totalCents = mostRepeated(grand.length > 0 ? grand : totals);
  const sum = subtotal !== null && tax !== null ? subtotal + tax : null;
  const paidInCash = tendered !== null && change !== null && tendered > change ? tendered - change : null;
  const fallbackTotalCents =
    totalCents ??
    (sum !== null && sum > 0 ? sum : null) ??
    mostRepeated(secondary) ??
    paidInCash ??
    (unlabelled.length > 0 ? Math.max(...unlabelled) : null);

  if (totalCents === null) return { totalCents, totalConfirmed: false, fallbackTotalCents };
  const seen = [...grand, ...totals, ...secondary].filter((amount) => amount === totalCents).length;
  return { totalCents, totalConfirmed: seen >= 2 || sum === totalCents || paidInCash === totalCents, fallbackTotalCents };
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
