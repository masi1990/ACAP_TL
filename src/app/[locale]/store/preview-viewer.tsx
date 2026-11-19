"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuiltStandardPreview } from "@/lib/standard-preview";
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import { withBasePath } from "@/lib/base-path";

type CatalogPreviewPayload = BuiltStandardPreview & {
  catalogItemId: string | null;
  standardVersionId?: string;
  editionLocale?: string;
  distribution?: string;
  openReading?: boolean;
  allowDownload?: boolean;
  completeness?: { ok: boolean; checks: Array<{ id: string; label: string; present: boolean }> } | null;
};

export function PreviewViewer({
  data,
  closeHref,
}: {
  data: CatalogPreviewPayload;
  closeHref: string;
}) {
  const openReading = Boolean(data.openReading);
  const allowDownload = Boolean(data.allowDownload);
  const pdfPages = (data.pdfPages ?? [])
    .map((page) => (openReading ? { ...page, access: "free" as const } : page))
    .filter((page) => openReading || page.access === "free");
  // Public HTML fallback: cover → contents → scope (same rule as PDF: stop at Clause 1)
  const htmlPages = openReading
    ? data.pages
    : data.pages.filter((page) => page.kind === "cover" || page.kind === "toc" || page.kind === "scope");
  const usePdf = pdfPages.length > 0;
  const [pageIndex, setPageIndex] = useState(0);
  const publicToc = openReading
    ? data.tableOfContents
    : data.tableOfContents.filter((entry) => entry.number === "1" || entry.includedInPreview);

  // Reset when switching catalogue items / uploaded language editions
  useEffect(() => {
    setPageIndex(0);
  }, [data.catalogItemId, data.standardVersionId, data.editionLabel, data.editionLocale]);

  useEffect(() => {
    if (pageIndex > Math.max(0, (usePdf ? pdfPages.length : htmlPages.length) - 1)) {
      setPageIndex(0);
    }
  }, [pageIndex, usePdf, pdfPages.length, htmlPages.length]);

  const total = usePdf ? pdfPages.length : htmlPages.length;
  const page = usePdf ? pdfPages[pageIndex] : null;
  const htmlPage = !usePdf ? htmlPages[pageIndex] : null;
  const scopeOnly = extractClause1ScopeOnly(
    data.scopeOnly || data.pages.find((p) => p.kind === "scope")?.content.body || "",
  );

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="max-h-[18vh] shrink-0 overflow-y-auto border-b border-[var(--line)] bg-[#f4f1ea] p-2 sm:p-3 lg:max-h-full lg:w-56 lg:border-b-0 lg:border-r xl:w-64">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-800">
          Preview for {data.editionLabel}
        </p>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
          Document pages
        </h3>
        <p className="mt-1 text-sm text-[var(--ink)]">
          {openReading && !allowDownload
            ? "Free to read on this page. This standard cannot be downloaded."
            : allowDownload
              ? "Free to read. You can also download the published file."
              : "Public preview: starting pages through Clause 1 Scope"}
        </p>
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-[12px]">
          {usePdf
            ? pdfPages.map((p, i) => (
                <li key={`${p.n}-${p.label}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setPageIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-black/5",
                      i === pageIndex && "bg-black/10 font-medium",
                    )}
                  >
                    <span className="w-5 tabular-nums text-[#1a1a1a]">{i + 1}</span>
                    <span className="flex-1 truncate">{p.label}</span>
                    <span className="text-[9px] uppercase tracking-wide text-emerald-700">open</span>
                  </button>
                </li>
              ))
            : htmlPages.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPageIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-black/5",
                      i === pageIndex && "bg-black/10 font-medium",
                    )}
                  >
                    <span className="w-5 tabular-nums text-[#1a1a1a]">{i + 1}</span>
                    <span className="flex-1 truncate">{p.label}</span>
                    <span className="text-[9px] uppercase tracking-wide text-emerald-700">open</span>
                  </button>
                </li>
              ))}
        </ul>

        {publicToc.length > 0 ? (
          <>
            <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
              Table of contents
            </h3>
            <p className="mt-1 text-[10px] text-[#1a1a1a]">
              {openReading ? `As published in ${data.editionLabel}` : "Clause 1 only in public preview"}
            </p>
            <ul className="mt-3 space-y-0.5 text-[13px]">
              {publicToc.map((entry, idx) => (
                <li
                  key={`store-toc-${idx}`}
                  className="flex gap-2 border-b border-dotted border-neutral-300/80 bg-emerald-500/10 px-1 py-1.5 font-medium text-[var(--ink)]"
                >
                  <span className="w-8 shrink-0 tabular-nums text-[11px]">{entry.number || "—"}</span>
                  <span className="flex-1 leading-snug">{entry.title}</span>
                  <span className="tabular-nums text-[11px] opacity-70">{entry.pageHint}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col bg-[#5c6166] p-2 sm:p-3">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-none flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-auto rounded-[2px] bg-[#2a2d30] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            {usePdf && page?.imageUrl ? (
              <div className="flex min-h-full w-full justify-center p-3 sm:p-5">
                {/* Large readable A4 — scroll if needed; do not shrink text to unreadability */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withBasePath(page.imageUrl)}
                  alt={`${data.editionLabel} — ${page.label}`}
                  draggable={allowDownload}
                  onContextMenu={openReading && !allowDownload ? (event) => event.preventDefault() : undefined}
                  className="mx-auto block h-auto w-[min(100%,960px)] min-w-0 bg-white object-contain shadow-md md:min-w-[min(100%,794px)]"
                />
              </div>
            ) : htmlPage ? (
              <div className="mx-auto min-h-[640px] w-full max-w-[860px] bg-[#f7f4ee] px-10 py-12 text-[#1a1a1a]">
                {htmlPage.kind === "cover" && (
                  <div className="space-y-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a1a]">{htmlPage.content.org}</p>
                    <p className="text-sm font-semibold">{htmlPage.content.documentType}</p>
                    <h2 className="font-[family-name:var(--font-display)] text-3xl">{htmlPage.content.designation}</h2>
                    <p className="text-lg">{htmlPage.content.title}</p>
                    <p className="text-xs text-[#1a1a1a]">ICS {htmlPage.content.ics}</p>
                  </div>
                )}
                {htmlPage.kind === "toc" && (
                  <div>
                    <h2 className="text-2xl font-semibold">{htmlPage.content.heading}</h2>
                    <p className="mt-2 text-sm text-neutral-600">{htmlPage.content.note}</p>
                    <ul className="mt-4 space-y-1 text-base">
                      {publicToc.map((e, idx) => (
                        <li key={`store-toc-page-${idx}`} className="font-medium">
                          {e.number}. {e.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {htmlPage.kind === "scope" && (
                  <div dir={/[\u0600-\u06FF]/.test(htmlPage.content.heading || "") ? "rtl" : undefined}>
                    <h2 className="text-2xl font-semibold">{htmlPage.content.heading || "1 Scope"}</h2>
                    <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">{scopeOnly}</p>
                    <p className="mt-8 border-t border-neutral-300 pt-4 text-center text-sm font-medium text-emerald-900">
                      {htmlPage.content.endBanner ||
                        "— End of free readable content (Clause 1 Scope only) —"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-white/70">Preview pages unavailable.</p>
            )}
          </div>

          <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-white">
                {(usePdf ? page?.label : htmlPage?.label) ?? "Page"} · {pageIndex + 1}/{total || 1}
              </p>
              {allowDownload && data.catalogItemId ? (
                <a
                  href={withBasePath(
                    `/api/store/free?item=${encodeURIComponent(data.catalogItemId)}&lang=${encodeURIComponent(data.editionLocale || "en")}`,
                  )}
                  className="text-sm font-medium text-white underline"
                >
                  Download
                </a>
              ) : null}
              <Link href={closeHref} className="text-sm text-white underline">
                Close
              </Link>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pageIndex >= total - 1}
              onClick={() => setPageIndex((i) => Math.min(total - 1, i + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
