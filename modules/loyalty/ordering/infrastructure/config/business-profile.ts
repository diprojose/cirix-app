/**
 * How customers pay the business and reach it on WhatsApp. This is presentation
 * data for the checkout / order screens (account numbers to pay into), not
 * domain logic — the single source of truth until an operator screen owns it.
 * Placeholder values — replace with the business's real accounts before launch.
 */
export const BUSINESS_PROFILE = {
  name: "mixmag",
  /** E.164 number that receives order messages, without the leading `+`. */
  whatsappNumber: "584120000000",
  pagoMovil: {
    bank: "Banco de Venezuela (0102)",
    phone: "0412-0000000",
    documentId: "V-00.000.000",
  },
  transfer: {
    bank: "Banco de Venezuela",
    accountNumber: "0102-0000-00-0000000000",
    holder: "mixmag C.A.",
    documentId: "J-00000000-0",
  },
  zelle: {
    email: "pagos@mixmag.example",
    holder: "mixmag",
  },
} as const;
