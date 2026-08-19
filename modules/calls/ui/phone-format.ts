export function maskPhoneNumber(phone: string): string {
  if (!phone.startsWith("+") || phone.length < 7) return "••••";
  const countryLength = phone.startsWith("+58") ? 3 : Math.min(4, phone.length - 4);
  return `${phone.slice(0, countryLength)} *** *** ${phone.slice(-4)}`;
}

