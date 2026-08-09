import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/locale";
import { InvitationClient } from "@/modules/n8n/ui/invitation-client";

export const metadata: Metadata = {
  title: "Invitación de cita · Cirix",
  description: "Demostración navegable de confirmación de citas.",
};

export default async function InvitationPage({ params }: { params: Promise<{ lang: string; token: string }> }) {
  const { lang, token } = await params;
  if (!hasLocale(lang)) notFound();
  return <InvitationClient locale={lang} token={token} />;
}
