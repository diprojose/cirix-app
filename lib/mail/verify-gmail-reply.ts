import { dkimVerify } from "mailauth/lib/dkim/verify";
import type { DKIMVerifyOptions } from "mailauth";
import type { Email } from "postal-mime";

export const operatorMailbox = "ciro.advertising@gmail.com";

export async function verifyGmailReply(raw: Buffer, message: Email, resolver?: DKIMVerifyOptions["resolver"]) {
  if (message.from?.address?.toLowerCase() !== operatorMailbox) return false;
  if (message.headers.filter((header) => header.key === "from").length !== 1) return false;
  if (message.headers.filter((header) => header.key === "to").length !== 1) return false;
  const result = await dkimVerify(raw, { minBitLength: 1024, strict: true, resolver });
  // Verify the actual message bytes, not caller-supplied Authentication-Results.
  if (result.results.some((entry) => entry.status.result === "temperror")) {
    throw new Error("Temporary DKIM verification failure");
  }
  return result.results.some((entry) =>
    entry.status.result === "pass" && entry.signingDomain?.toLowerCase() === "gmail.com" &&
    !entry.canonBodyLengthLimited && entry.signatureTimeValid !== false &&
    entry.signingHeaders?.keys.toLowerCase().split(":").map((key) => key.trim()).includes("to")
  );
}
