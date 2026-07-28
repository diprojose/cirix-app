import { LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default function LocalizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
