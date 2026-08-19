export type WebhookValidationInput = {
  signature: string;
  url: string;
  params: Record<string, string>;
};

export interface TelephonyProvider {
  validateWebhook(input: WebhookValidationInput): boolean;
  createForwardResponse(options: {
    destinationNumber: string;
    statusCallbackUrl: string;
  }): string;
  createHangupResponse(): string;
}

