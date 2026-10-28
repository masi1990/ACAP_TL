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

/** Full-screen preview overlay (URL-driven; works without Radix dialog) */
export function StorePreviewOverlay({
  locale,
  data,
  closeHref,
}: {
  locale: string;
  data: CatalogPreviewPayload;
  closeHref?: string;
}) {
  const close = closeHref ?? `/${locale}/store`;
  const ui: Locale = isLocale(locale) ? locale : "en";
  const languageName =
    data.editionLocale === "fr"
      ? t(ui, "French")
      : data.editionLocale === "pt"
        ? t(ui, "Portuguese")
        : data.editionLocale === "ar"
          ? t(ui, "Arabic")
          : data.editionLocale
            ? t(ui, "English")
            : "";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-preview-title"
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-2 sm:p-4">
        <div className="flex max-h-full flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-4">
            <div>
              <h2
                id="store-preview-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                {data.editionLabel}
                {languageName ? ` — ${languageName}` : data.openReading ? " — full text" : " — public preview"}
              </h2>
            </div>
            <Link
              href={close}
              className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </Link>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden" style={{ maxHeight: "calc(100vh - 8rem)" }}>
            <PreviewViewer data={data} closeHref={close} />
          </div>
        </div>
      </div>
    </div>
  );
}
