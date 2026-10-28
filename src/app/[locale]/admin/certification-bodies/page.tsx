import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";

export default async function CertificationBodiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ClientRedirect href={`/${locale}/admin/institutions`} />;
}
