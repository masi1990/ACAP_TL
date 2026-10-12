import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { AdminChrome } from "./admin-chrome";

/**
 * Keep this layout free of redirect()/auth side-effects.
 * Next.js 16 + Turbopack throws Performance.measure negative-timestamp
 * errors when an async layout aborts via redirect().
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return <AdminChrome locale={locale}>{children}</AdminChrome>;
}
