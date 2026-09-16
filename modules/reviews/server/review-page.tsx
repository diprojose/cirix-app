import Image from "next/image";
import type { Metadata } from "next";
import { getCurrentLocale } from "@/lib/i18n";
import { reviewCopy } from "../lib/copy";
import { reviewSource } from "../lib/constants";
import { GoogleReviewForm } from "../ui/google-review-form";
import s from "../ui/reviews.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const copy = reviewCopy[await getCurrentLocale()];
  return { title: copy.metadataTitle, description: copy.metadataDescription, robots: { index: false, follow: false } };
}

export default async function ReviewPage({ searchParams }: {
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  const source = reviewSource((await searchParams).source);
  return <main className={s.page}>
    <div className={s.container}>
      <Image src="/brand/logo-white.svg" alt="CIRIX" width={160} height={57} className={s.logo} />
      <GoogleReviewForm key={source} source={source} />
    </div>
  </main>;
}
