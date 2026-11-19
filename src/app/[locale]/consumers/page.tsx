import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { countryOptions } from "@/lib/countries";
import { ComplaintForm } from "./complaint-form";

export default async function ConsumersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="shell space-y-8 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t(locale, "Consumers")}</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          {t(locale, "Report a product")}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Search for the certified product by PIN, brand, or manufacturer and confirm it so the complaint reaches
          the certification body that issued the certificate. You can also check a PIN on the{" "}
          <Link className="text-[var(--accent)] underline" href={`/${locale}/verify`}>
            public verify page
          </Link>
          .
        </p>
      </div>

      <ComplaintForm countryOptions={countryOptions()} />
    </div>
  );
}
