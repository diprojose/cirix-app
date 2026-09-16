import type { Locale } from "@/lib/locale";
import type { Invitation } from "../domain/reviews";
export function publicReviewLink(origin: string, token: string, source: string, locale: Locale) {
  const url = new URL(`/${locale}/make-a-review`, origin);
  url.searchParams.set("ref", token); url.searchParams.set("source", source);
  return url.toString();
}
export function invitationMessage(item: Invitation, link: string, locale: Locale) {
  return locale === "es" ? `Hola ${item.clientName}, gracias por elegir Cirix. ¿Compartirías tu experiencia en Google?\n${link}` : `Hi ${item.clientName}, thank you for choosing Cirix. Would you share your experience on Google?\n${link}`;
}
export function invitationComposeLink(item: Invitation, link: string, locale: Locale) {
  const body = encodeURIComponent(invitationMessage(item, link, locale));
  if (item.source === "email") return `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(locale === "es" ? "Tu experiencia con Cirix" : "Your experience with Cirix")}&body=${body}`;
  if (item.source === "whatsapp") return `https://wa.me/${item.phone.replace(/\D/g, "")}?text=${body}`;
  if (item.source === "sms") return `sms:+${item.phone.replace(/\D/g, "")}?body=${body}`;
  return null;
}
