"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminFullStandardPreview } from "@/lib/admin-standard-preview";

/** Authenticated full-standard viewer — no Clause-2 blur / lock. */
export function FullPreviewViewer({
  data,
  closeHref,
}: {
  data: AdminFullStandardPreview;
  closeHref: string;
}) {
  const pdfPages = data.pdfPages ?? [];
  const usePdf = pdfPages.length > 0;
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [data.standardVersionId, data.editionLabel]);

  const total = usePdf ? pdfPages.length : data.pages.length;
  const page = usePdf ? pdfPages[pageIndex] : null;
  const htmlPage = !usePdf ? data.pages[pageIndex] : null;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="max-h-[40vh] shrink-0 overflow-y-auto border-b border-[var(--line)] bg-[var(--surface-2)] p-4 lg:max-h-full lg:w-72 lg:border-b-0 lg:border-r">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-800">
          Full standard · {data.editionLabel}
        </p>
        <p className="text-xs text-[var(--muted)]">
          Authenticated preview — all clauses readable (not the public Clause-1 view).
        </p>

        {data.tariffMaps.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Linked tariff lines
            </h3>
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px]">
              {data.tariffMaps.map((m) => (
                <li key={m.id} className="rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1">
                  <span className="font-mono">{m.codeDisplay}</span>
                  <span className="text-[var(--muted)]"> · {m.rec}</span>
                  <div className="truncate text-[var(--muted)]">{m.description}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Document pages
        </h3>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[12px]">
          {usePdf
            ? pdfPages.map((p, i) => (
                <li key={`${p.n}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setPageIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface)]",
                      i === pageIndex && "bg-[var(--surface)] font-medium",
                    )}
                  >
                    <span className="w-5 tabular-nums text-[var(--muted)]">{i + 1}</span>
                    <span className="flex-1 truncate">{p.label}</span>
                    <span className="text-[9px] uppercase tracking-wide text-emerald-700">open</span>
                  </button>
                </li>
              ))
            : data.pages.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPageIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface)]",
                      i === pageIndex && "bg-[var(--surface)] font-medium",
                    )}
                  >
                    <span className="w-5 tabular-nums text-[var(--muted)]">{i + 1}</span>
                    <span className="flex-1 truncate">{p.label}</span>
                  </button>
                </li>
              ))}
        </ul>

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Table of contents
        </h3>
        <ul className="mt-2 space-y-0.5 text-[13px]">
          {data.tableOfContents.map((entry, idx) => (
            <li
              key={`admin-toc-${idx}`}
              className="flex gap-2 border-b border-dotted border-[var(--line)] px-1 py-1.5"
            >
              <span className="w-8 shrink-0 tabular-nums text-[11px]">{entry.number || "—"}</span>
              <span className="flex-1 leading-snug">{entry.title}</span>
              <span className="tabular-nums text-[11px] opacity-70">{entry.pageHint}</span>
            </li>
          ))}
        </ul>

        {data.machinePack && (
          <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
            Pack: {data.machinePack.clauseCount} clauses · {data.machinePack.requirementCount} requirements ·{" "}
            {data.machinePack.normativeRefCount} normative refs · {data.machinePack.fullTextChars} chars ·{" "}
            {data.machinePack.publicationStatus}
          </p>
        )}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col bg-[#3d4449] p-3 sm:p-5">
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-y-auto rounded-[2px] bg-[#2a2d30] shadow-lg">
            {usePdf && page ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.imageUrl}
                alt={`${data.editionLabel} — ${page.label}`}
                className="mx-auto block h-auto w-full max-w-[640px] bg-white"
              />
            ) : htmlPage ? (
              <div className="min-h-[480px] bg-[#f7f4ee] px-8 py-10 text-[#1a1a1a]">
                {htmlPage.kind === "cover" && (
                  <div className="space-y-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{htmlPage.content.org}</p>
                    <p className="text-sm font-semibold">{htmlPage.content.documentType}</p>
                    <h2 className="font-[family-name:var(--font-display)] text-3xl">
                      {htmlPage.content.designation}
                    </h2>
                    <p className="text-lg">{htmlPage.content.title}</p>
                    <p className="text-xs text-neutral-500">ICS {htmlPage.content.ics}</p>
                    <p className="mt-6 text-xs text-emerald-800">{htmlPage.content.legalNote}</p>
                  </div>
                )}
                {htmlPage.kind === "toc" && (
                  <div>
                    <h2 className="text-xl font-semibold">{htmlPage.content.heading}</h2>
                    <p className="mt-2 text-sm text-neutral-600">{htmlPage.content.note}</p>
                    <ul className="mt-4 space-y-1 text-sm">
                      {data.tableOfContents.map((e, idx) => (
                        <li key={`admin-toc-page-${idx}`}>
                          {e.number}. {e.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(htmlPage.kind === "scope" || htmlPage.kind === "body") && (
                  <div>
                    <h2 className="text-xl font-semibold">{htmlPage.content.heading}</h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
                      {htmlPage.content.body}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-white/70">Full preview unavailable.</p>
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
              <p className="text-xs text-white/80">
                {(usePdf ? page?.label : htmlPage?.label) ?? "Page"} · {pageIndex + 1}/{total || 1}
              </p>
              <Link href={closeHref} className="text-sm text-white/90 underline hover:text-white">
                Back to standards
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
