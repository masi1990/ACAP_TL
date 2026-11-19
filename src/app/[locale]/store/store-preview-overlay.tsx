"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { BuiltStandardPreview } from "@/lib/standard-preview";
import { t, isLocale, type Locale } from "@/lib/i18n";
import { PreviewViewer } from "./preview-viewer";

type CatalogPreviewPayload = BuiltStandardPreview & {
  catalogItemId: string | null;
  standardVersionId?: string;
  editionLocale?: string;
  openReading?: boolean;
  allowDownload?: boolean;
  completeness?: { ok: boolean; checks: Array<{ id: string; label: string; present: boolean }> } | null;
};

function languageLabel(ui: Locale, code: string | undefined) {
  if (code === "fr") return t(ui, "French");
  if (code === "pt") return t(ui, "Portuguese");
  if (code === "ar") return t(ui, "Arabic");
  if (code === "en") return t(ui, "English");
  return code || "";
}

/** Full-screen preview overlay (URL-driven; works without Radix dialog) */
export function StorePreviewOverlay({
  locale,
  data,
  closeHref,
  languages = [],
}: {
  locale: string;
  data: CatalogPreviewPayload;
  closeHref?: string;
  /** Uploaded language editions available for this standard */
  languages?: { locale: string; label: string }[];
}) {
  const close = closeHref ?? `/${locale}/store`;
  const ui: Locale = isLocale(locale) ? locale : "en";
  const languageName = languageLabel(ui, data.editionLocale);
  const catalogItemId = data.catalogItemId;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-preview-title"
    >
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col p-1 sm:p-3">
        <div className="flex max-h-full flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 sm:px-5">
            <div className="min-w-0 space-y-2">
              <h2
                id="store-preview-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                {data.editionLabel}
                {languageName ? ` — ${languageName}` : data.openReading ? " — full text" : " — public preview"}
              </h2>
              {catalogItemId && languages.length > 1 ? (
                <nav className="flex flex-wrap gap-2" aria-label={t(ui, "Language")}>
                  {languages.map((language) => {
                    const active = language.locale === data.editionLocale;
                    return (
                      <Link
                        key={language.locale}
                        href={`/${locale}/store?preview=${encodeURIComponent(catalogItemId)}&lang=${encodeURIComponent(language.locale)}`}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                          active
                            ? "bg-[var(--ink)] text-white"
                            : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-3)]"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        {language.label}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
            </div>
            <Link
              href={close}
              className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </Link>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden" style={{ height: "calc(100vh - 4.5rem)" }}>
            <PreviewViewer data={data} closeHref={close} />
          </div>
        </div>
      </div>
    </div>
  );
}
