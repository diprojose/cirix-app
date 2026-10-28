/** URL helpers for the table QR, shared by the signup page, the card page and the printable QR. */

/** A table code looks like this; anything else in the URL is dropped, not forwarded. */
const TABLE_CODE = /^[A-Za-z0-9_-]{1,64}$/;

/** The table code from a `t` search parameter, or null when absent or malformed. */
export function readTableCodeParam(value: string | string[] | undefined): string | null {
  const code = Array.isArray(value) ? value[0] : value;
  return code !== undefined && TABLE_CODE.test(code) ? code : null;
}

/** The customer's card page, carrying the table code when there is one. */
export const cardPath = (slug: string, tableCode: string | null): string =>
  tableCode === null ? `/me/cards/${slug}` : `/me/cards/${slug}?t=${encodeURIComponent(tableCode)}`;

/** The path printed inside the table QR: signup for newcomers, the card (and stamp) for everyone. */
export const tableQrPath = (slug: string, tableCode: string): string =>
  `/b/${slug}?source=table_qr&t=${encodeURIComponent(tableCode)}`;
