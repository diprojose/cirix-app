import Image from "next/image";
import type { Metadata } from "next";
import { getCurrentLocale } from "@/lib/i18n";
import { reviewCopy } from "../lib/copy";
import { reviewSource } from "../lib/constants";
import { GoogleReviewForm } from "../ui/google-review-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import s from "../ui/reviews.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const copy = reviewCopy[await getCurrentLocale()];
  return { title: copy.metadataTitle, description: copy.metadataDescription, robots: { index: false, follow: false } };
}

export default async function ReviewPage({ searchParams }: {
  searchParams: Promise<{ source?: string | string[]; ref?: string | string[] }>;
}) {
  const query = await searchParams;
  const locale = await getCurrentLocale();
  const source = reviewSource(query.source);
  const candidate = Array.isArray(query.ref) ? query.ref[0] : query.ref;
  const token = candidate && /^[a-f0-9]{48}$/.test(candidate) ? candidate : undefined;
  return <div className={s.page}>
    <header className={s.header}><div className={s.container}>
      <a href={`/${locale}`} aria-label={locale === "es" ? "Inicio de Cirix" : "Cirix home"}><Image src="/brand/logo-white.svg" alt="CIRIX" width={128} height={46} className={s.logo} /></a>
      <span className={s.product}>Google Reviews</span><LanguageSwitcher />
    </div></header>
    <main className={`${s.container} ${s.content}`}>
      <GoogleReviewForm key={`${source}:${token ?? ""}`} source={source} token={token} />
    </main>
    <footer className={`${s.container} ${s.footer}`}><span>CIRIX · DIGITAL BUSINESS SOLUTIONS</span><a href={`/${locale}`}>{locale === "es" ? "Conoce nuestro ecosistema" : "Discover our ecosystem"} <span aria-hidden="true">↗</span></a></footer>
  </div>;
}
