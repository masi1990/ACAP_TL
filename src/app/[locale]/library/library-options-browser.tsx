"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { apiFetch } from "@/lib/base-path";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { LibraryCatalogue } from "./library-catalogue";
import type { LibraryFacet, LibraryFilter, LibraryStandardRow } from "./library-types";

/**
 * Server-paged catalogue (20 per page) fed by the options API: the public catalogue for visitors,
 * or, with `holdings`, only the standards released to the signed-in library user.
 */
export function LibraryOptionsBrowser({
  locale,
  holdings = false,
  action,
  emptyLabel,
}: {
  locale: Locale;
  holdings?: boolean;
  action?: (row: LibraryStandardRow) => ReactNode;
  emptyLabel?: string;
}) {
  const [facets, setFacets] = useState<LibraryFacet | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>({ sectorId: "", committeeId: "", kind: "" });
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LibraryStandardRow[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function setQuery(value: string) {
    setQueryState(value);
    setPage(1);
  }
  function applyFilter(next: LibraryFilter) {
    setFilter(next);
    setPage(1);
  }

  useEffect(() => {
    const params = new URLSearchParams({ browse: "1", lang: locale, page: String(page), pageSize: String(LIST_PAGE_SIZE) });
    if (holdings) params.set("holdings", "1");
    const q = query.trim();
    if (q.length >= 2) params.set("q", q);
    if (filter.sectorId) params.set("sector", filter.sectorId);
    if (filter.committeeId) params.set("committee", filter.committeeId);
    if (filter.kind) params.set("kind", filter.kind);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      apiFetch(`/api/library/options?${params}`, { signal: controller.signal })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Could not load standards");
          return data;
        })
        .then((data) => {
          if (data.facets) setFacets(data.facets);
          setRows(data.standards || []);
          setMatchCount(typeof data.matchCount === "number" ? data.matchCount : (data.standards || []).length);
          setError("");
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Could not load standards");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, q.length >= 2 ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter, locale, page, holdings]);

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <LibraryCatalogue
        locale={locale}
        mode="browse"
        rows={rows}
        facets={facets || undefined}
        filter={filter}
        onFilter={applyFilter}
        action={action}
        query={query}
        onQuery={setQuery}
        totalCount={matchCount}
        page={page}
        onPage={setPage}
        emptyLabel={
          loading
            ? "Loading standards…"
            : emptyLabel || "No published standards match this selection."
        }
      />
    </div>
  );
}
