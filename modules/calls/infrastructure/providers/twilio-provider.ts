import twilio from "twilio";
import type { TelephonyProvider, WebhookValidationInput } from "../../domain/telephony-provider";

export class TwilioProvider implements TelephonyProvider {
  constructor(private readonly authToken: string) {}

  validateWebhook(input: WebhookValidationInput): boolean {
    return twilio.validateRequest(this.authToken, input.signature, input.url, input.params);
  }

  createForwardResponse(options: { destinationNumber: string; statusCallbackUrl: string }): string {
    const response = new twilio.twiml.VoiceResponse();
    const dial = response.dial({ answerOnBridge: true });
    dial.number(
      {
        statusCallback: options.statusCallbackUrl,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      },
      options.destinationNumber
    );
    return response.toString();
  }

  createHangupResponse(): string {
    const response = new twilio.twiml.VoiceResponse();
    response.hangup();
    return response.toString();
  }
}

