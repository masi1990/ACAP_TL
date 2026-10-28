"use client";

import { useState } from "react";
import Link from "next/link";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { ScopeReveal } from "@/components/scope-reveal";
import { StoreClient } from "./store-client";

export function StoreCatalogItem({
  locale,
  catalogItemId,
  editionLabel,
  coverTitle,
  scopeEn,
  priceLabel,
  priceCents,
  currency,
  distribution = "PAID",
  languages,
  kindLabel,
  sectorName,
  committeeName,
  adopted,
  adoptionTotal,
  adoptionPercent,
  adoptingCountries,
}: {
  locale: string;
  catalogItemId: string;
  editionLabel: string;
  coverTitle: string;
  scopeEn: string;
  priceLabel: string;
  priceCents: number;
  currency: string;
  distribution?: string;
  languages: { locale: string; label: string; published: boolean }[];
  kindLabel: string;
  sectorName: string | null;
  committeeName: string | null;
  adopted: number;
  adoptionTotal: number;
  adoptionPercent: number;
  adoptingCountries: string[];
}) {
  const ui: Locale = isLocale(locale) ? locale : "en";
  const [editionLocale, setEditionLocale] = useState("");
  const languageReady = languages.some((language) => language.published && language.locale === editionLocale);
  const previewLang = editionLocale || languages.find((language) => language.published)?.locale || "en";
  const languageLabel = languages.find((language) => language.locale === editionLocale)?.label || "";
  const previewHref = `/${locale}/store?preview=${encodeURIComponent(catalogItemId)}&lang=${encodeURIComponent(previewLang)}`;

  return (
    <article className="panel overflow-hidden">
      <Link
        href={previewHref}
        className="hero-plane block min-h-40 w-full px-5 py-6 transition-opacity hover:opacity-95"
      >
        <p className="text-sm uppercase tracking-[0.16em] text-white">
          {distribution === "FREE_VIEW"
            ? "African Standard · free to read, no download"
            : distribution === "FREE_DOWNLOAD"
              ? "African Standard · free to read and download"
              : "African Standard · tap to preview"}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">{editionLabel}</h2>
        <p className="mt-1 text-sm text-white/80">{coverTitle}</p>
      </Link>
      <div className="space-y-3 p-5">
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">{t(ui, "Category")}: </span>
          {kindLabel}
          {sectorName ? ` · ${t(ui, "Sector")} ${sectorName}` : ""}
          {committeeName ? ` · ${t(ui, "Technical committee")} ${committeeName}` : ""}
        </p>
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">{t(ui, "Adopted by")} </span>
          {adopted} {t(ui, "of")} {adoptionTotal} · {adoptionPercent}%
          <span className="block">{t(ui, "African Union member states")}</span>
        </p>
        {adoptingCountries.length > 0 ? (
          <p className="text-sm leading-relaxed text-[var(--muted)]">{adoptingCountries.join(", ")}</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t(ui, "No adopting countries recorded")}</p>
        )}
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{t(ui, "Language")}</span>
          <select
            value={editionLocale}
            onChange={(event) => setEditionLocale(event.target.value)}
            className="h-12 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base"
          >
            <option value="">{t(ui, "Choose language")}</option>
            {languages.map((language) => (
              <option key={language.locale} value={language.locale} disabled={!language.published}>
                {language.published ? language.label : `${language.label} — ${t(ui, "not published")}`}
              </option>
            ))}
          </select>
        </label>
        <ScopeReveal text={scopeEn} mode="hidden" />
        <p className="text-xl font-semibold text-[var(--ink)]">{priceLabel}</p>
        <StoreClient
          locale={locale}
          catalogItemId={catalogItemId}
          designation={editionLabel}
          title={coverTitle}
          previewHref={previewHref}
          languageReady={languageReady}
          editionLocale={editionLocale}
          previewLocale={previewLang}
          languageLabel={languageLabel}
          priceCents={priceCents}
          currency={currency}
          distribution={distribution}
        />
      </div>
    </article>
  );
}
