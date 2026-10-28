"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuiltStandardPreview } from "@/lib/standard-preview";
import { extractClause1ScopeOnly } from "@/lib/scope-text";

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
  const pdfPages = (data.pdfPages ?? []).map((page) =>
    openReading ? { ...page, access: "free" as const } : page,
  );
  const usePdf = pdfPages.length > 0;
  const [pageIndex, setPageIndex] = useState(0);

  // Reset when switching catalogue items / standards
  useEffect(() => {
    setPageIndex(0);
  }, [data.catalogItemId, data.standardVersionId, data.editionLabel]);

  const total = usePdf ? pdfPages.length : data.pages.length;
  const page = usePdf ? pdfPages[pageIndex] : null;
  const htmlPage = !usePdf ? data.pages[pageIndex] : null;
  const scopeOnly = extractClause1ScopeOnly(data.scopeOnly || data.pages.find((p) => p.kind === "scope")?.content.body || "");

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="max-h-[34vh] shrink-0 overflow-y-auto border-b border-[var(--line)] bg-[#f4f1ea] p-4 lg:max-h-full lg:w-64 lg:border-b-0 lg:border-r">
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
              : "This standard only — Clause 1 Scope is free"}
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
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wide",
                        p.access === "free" && "text-emerald-700",
                        p.access === "locked" && "text-neutral-400",
                      )}
                    >
                      {p.access === "free" ? "open" : "locked"}
                    </span>
                  </button>
                </li>
              ))
            : data.pages.map((p, i) => (
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

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
          Table of contents
        </h3>
        <p className="mt-1 text-[10px] text-[#1a1a1a]">As published in {data.editionLabel}</p>
        <ul className="mt-3 space-y-0.5 text-[13px]">
          {data.tableOfContents.map((entry, idx) => {
            const isScope = entry.number === "1" || entry.includedInPreview;
            const isClause2 = !openReading && (entry.number === "2" || /^2(\.0)?$/.test(entry.number));
            return (
              <li
                key={`store-toc-${idx}`}
                className={cn(
                  "flex gap-2 border-b border-dotted border-neutral-300/80 px-1 py-1.5 text-[var(--ink)]",
                  isScope
                    ? "bg-emerald-500/10 font-medium"
                    : isClause2
                      ? "select-none text-transparent blur-sm"
                      : "",
                )}
                aria-hidden={isClause2 || undefined}
                title={isClause2 ? "Clause 2 is not part of the free preview" : undefined}
              >
                <span className="w-8 shrink-0 tabular-nums text-[11px]">{entry.number || "—"}</span>
                <span className="flex-1 leading-snug">{isClause2 ? "············" : entry.title}</span>
                <span className="tabular-nums text-[11px] opacity-70">{isClause2 ? "" : entry.pageHint}</span>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col bg-[#5c6166] p-3 sm:p-5">
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-y-auto rounded-[2px] bg-[#2a2d30] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            {usePdf && page ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.imageUrl}
                  alt={`${data.editionLabel} — ${page.label}`}
                  draggable={allowDownload}
                  onContextMenu={openReading && !allowDownload ? (event) => event.preventDefault() : undefined}
                  className={cn(
                    "mx-auto block h-auto w-full max-w-[640px] bg-white",
                    page.access === "locked" && "pointer-events-none",
                  )}
                />
                {page.access === "locked" && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
                    <span className="rounded-md bg-[#0f2a24]/95 px-4 py-2 text-xs font-medium text-[#f4fff9] shadow-lg">
                      Locked — Clause 2+ not included in free preview
                    </span>
                  </div>
                )}
                {page.access === "free" && page.note && (
                  <p className="border-t border-white/10 bg-black/40 px-4 py-2 text-center text-[11px] text-emerald-100">
                    {page.note}
                  </p>
                )}
              </>
            ) : htmlPage ? (
              <div className="min-h-[480px] bg-[#f7f4ee] px-8 py-10 text-[#1a1a1a]">
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
                    <h2 className="text-xl font-semibold">{htmlPage.content.heading}</h2>
                    <p className="mt-2 text-sm text-neutral-600">{htmlPage.content.note}</p>
                    <ul className="mt-4 space-y-1 text-sm">
                      {data.tableOfContents.map((e, idx) => (
                        <li key={`store-toc-page-${idx}`} className={e.includedInPreview ? "font-medium" : "text-neutral-400"}>
                          {e.number}. {e.includedInPreview ? e.title : "········"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {htmlPage.kind === "scope" && (
                  <div>
                    <h2 className="text-xl font-semibold">1 Scope</h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{scopeOnly}</p>
                    <p className="mt-8 border-t border-neutral-300 pt-4 text-center text-xs font-medium text-emerald-900">
                      — End of free readable content (Clause 1 Scope only) —
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-white/70">Preview pages unavailable.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
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
                  href={`/api/store/free?item=${encodeURIComponent(data.catalogItemId)}&lang=${encodeURIComponent(data.editionLocale || "en")}`}
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
