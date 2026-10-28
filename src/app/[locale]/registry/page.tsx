import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { RegistryClient } from "./registry-client";

export default async function PublicRegistryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="shell py-10">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Public registry</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          {t(locale, "registryTitle")}
        </h1>
        <p className="mt-3 text-[var(--muted)]">{t(locale, "registryHint")}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Products carry the <strong className="font-medium text-[var(--ink)]">ARSO Quality Mark</strong>{" "}
          and/or <strong className="font-medium text-[var(--ink)]">Eco Mark Africa</strong> after
          certification against an African Standard. Standards may map to many tariff lines.
        </p>
      </div>

      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading registry…</p>}>
          <RegistryClient locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
