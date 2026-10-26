/** The little a stamp flow needs to know about a customer. */
export type CustomerSummary = {
  /** First word of the name only: staff confirm who they are stamping, no more. */
  firstName: string;
};

/**
 * CustomerDirectory answers "is this person a customer of this business?". It
 * is a port so the stamp module does not depend on how the CRM stores people;
 * the composition root connects it to the CRM core.
 */
export interface CustomerDirectory {
  find(businessId: string, userId: string): Promise<CustomerSummary | null>;
}
