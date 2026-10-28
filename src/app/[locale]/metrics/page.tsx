import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function MetricsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  redirect(`/${raw}/analytics#operations`);
}
