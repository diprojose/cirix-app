import { generateKeyPairSync } from "node:crypto";
import { dkimSign } from "mailauth/lib/dkim/sign";
import PostalMime from "postal-mime";
import { describe, expect, it } from "vitest";
import { verifyGmailReply } from "@/lib/mail/verify-gmail-reply";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicKey = keys.publicKey.export({ type: "spki", format: "der" }).toString("base64");
const resolver = async () => [[`v=DKIM1; k=rsa; p=${publicKey}`]];
const raw = "From: ciro.advertising@gmail.com\r\nTo: reply+test@cirixad.com\r\nSubject: Respuesta\r\n\r\nRespuesta autorizada\r\n";
async function sign(domain = "gmail.com", headers = ["from", "to", "subject"], limited = false) {
  const signed = await dkimSign(raw, { signingDomain: domain, selector: "test", privateKey, signatureData: [{ signingDomain: domain, selector: "test", privateKey, headerList: headers, ...(limited ? { maxBodyLength: 5 } : {}) }] });
  return signed.signatures + raw;
}
async function verify(value: string) {
  return verifyGmailReply(Buffer.from(value), await PostalMime.parse(value), resolver);
}
describe("Gmail reply authorization with real DKIM signatures", () => {
  it("accepts the operator when Gmail signs the complete message and recipient", async () => {
    expect(await verify(await sign())).toBe(true);
  });
  it("rejects forged Authentication-Results without a cryptographic signature", async () => {
    expect(await verify(`Authentication-Results: example; dkim=pass header.d=gmail.com\r\n${raw}`)).toBe(false);
  });
  it("rejects signatures from other domains even with the operator in From", async () => {
    expect(await verify(await sign("attacker.example"))).toBe(false);
  });
  it("rejects tampered bodies and recipients", async () => {
    const signed = await sign();
    expect(await verify(signed.replace("Respuesta autorizada", "Cuerpo alterado"))).toBe(false);
    expect(await verify(signed.replace("reply+test@", "reply+another@"))).toBe(false);
  });
  it("rejects signatures that leave the recipient or part of the body unsigned", async () => {
    expect(await verify(await sign("gmail.com", ["from", "subject"]))).toBe(false);
    expect(await verify(await sign("gmail.com", ["from", "to", "subject"], true))).toBe(false);
  });
  it("rejects ambiguous duplicate sender and recipient headers", async () => {
    expect(await verify(`From: ciro.advertising@gmail.com\r\n${await sign()}`)).toBe(false);
    expect(await verify(`To: other@cirixad.com\r\n${await sign()}`)).toBe(false);
  });
});
