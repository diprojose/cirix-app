/**
 * How customers pay the business and reach it on WhatsApp. This is presentation
 * data for the checkout / order screens (account numbers to pay into), not
 * domain logic — the single source of truth until an operator screen owns it.
 * Placeholder values — replace with the business's real accounts before launch.
 */
export type BusinessProfile = {
  name: string;
  whatsappNumber: string;
  pagoMovil: { bank: string; phone: string; documentId: string };
  transfer: {
    bank: string;
    accountNumber: string;
    holder: string;
    documentId: string;
  };
  zelle: { email: string; holder: string };
};

export const BUSINESS_PROFILE: BusinessProfile = {
  name: "Cirix Tech Platform",
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
    holder: "Cirix Tech Platform C.A.",
    documentId: "J-00000000-0",
  },
  zelle: {
    email: "pagos@cirix.example",
    holder: "Cirix Tech Platform",
  },
};

/** Demo-safe contact profile whose customer-facing identity matches the store. */
export function businessProfileForBrand(displayName: string): BusinessProfile {
  return {
    ...BUSINESS_PROFILE,
    name: displayName,
    transfer: {
      ...BUSINESS_PROFILE.transfer,
      holder: `${displayName} C.A.`,
    },
    zelle: {
      email: "pagos@demo.example",
      holder: displayName,
    },
  };
}
