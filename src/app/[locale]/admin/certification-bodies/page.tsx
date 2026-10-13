import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export default async function CertificationBodiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/admin/institutions`);
}
