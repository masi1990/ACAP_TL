"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import type { Locale } from "@/lib/i18n";
import { LibraryAnalysis } from "./library-analysis";
import { LibrarySidebar } from "./library-sidebar";
import { LibraryStandardsTable } from "./library-standards-table";
import { facetsFromRows, type LibraryFacet, type LibraryFilter, type LibraryStandardRow } from "./library-types";

export function LibraryCatalogue({
  locale,
  rows,
  facets,
  filter,
  onFilter,
  mode,
  action,
  emptyLabel = "No standards are listed for this selection.",
  onSelectSectorFromAnalysis,
  query,
  onQuery,
}: {
  locale: Locale;
  rows: LibraryStandardRow[];
  facets?: LibraryFacet;
  filter?: LibraryFilter;
  onFilter?: (next: LibraryFilter) => void;
  mode: "browse" | "add";
  action?: (row: LibraryStandardRow) => ReactNode;
  emptyLabel?: string;
  onSelectSectorFromAnalysis?: (sectorId: string) => void;
  /** Parent-owned (server) search; omit for client-side search over `rows`. */
  query?: string;
  onQuery?: (value: string) => void;
}) {
  const [view, setView] = useState<"browse" | "analysis">("browse");
  const [localFilter, setLocalFilter] = useState<LibraryFilter>({ sectorId: "", committeeId: "", kind: "" });
  const current = filter || localFilter;
  const catalogue = useMemo(() => facets || facetsFromRows(rows), [facets, rows]);

  function apply(next: LibraryFilter) {
    if (onFilter) onFilter(next);
    else setLocalFilter(next);
  }

  function selectSector(sectorId: string) {
    apply({ sectorId, committeeId: "", kind: "" });
    setView("browse");
    onSelectSectorFromAnalysis?.(sectorId);
  }

  return (
    <DeskTabs
      syncHash={false}
      activeId={view}
      onSelect={(id) => setView(id as "browse" | "analysis")}
      tabs={[
        {
          id: "browse",
          label: "Browse",
          content: (
            <div className="grid items-start gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
              <LibrarySidebar catalogue={catalogue} filter={current} onFilter={apply} />
              <LibraryStandardsTable
                locale={locale}
                rows={rows}
                catalogue={catalogue}
                filter={current}
                onFilter={apply}
                action={action}
                emptyLabel={emptyLabel}
                query={query}
                onQuery={onQuery}
                showSearch={mode === "browse"}
              />
            </div>
          ),
        },
        {
          id: "analysis",
          label: "Analysis",
          content: <LibraryAnalysis locale={locale} rows={rows} catalogue={catalogue} onSelectSector={selectSector} />,
        },
      ]}
    />
  );
}
