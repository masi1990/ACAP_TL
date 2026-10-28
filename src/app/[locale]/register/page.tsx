import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { countryOptions } from "@/lib/countries";
import { isLocale } from "@/lib/i18n";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const bodies = await prisma.organization.findMany({
    where: { type: "CB", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return (
    <RegisterForm
      locale={locale}
      countries={countryOptions()}
      bodies={bodies.map((body) => ({ value: body.id, label: body.name }))}
    />
  );
}
