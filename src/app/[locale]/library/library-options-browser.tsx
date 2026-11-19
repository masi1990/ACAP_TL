"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { LibraryCatalogue } from "./library-catalogue";
import type { LibraryFacet, LibraryFilter, LibraryStandardRow } from "./library-types";

/** Read-only catalogue for visitors without library access, fed by the public options API. */
export function LibraryOptionsBrowser({ locale }: { locale: Locale }) {
  const [facets, setFacets] = useState<LibraryFacet | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>({ sectorId: "", committeeId: "", kind: "" });
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<LibraryStandardRow[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ browse: "1", lang: locale });
    const q = query.trim();
    if (q.length >= 2) params.set("q", q);
    if (filter.sectorId) params.set("sector", filter.sectorId);
    if (filter.committeeId) params.set("committee", filter.committeeId);
    if (filter.kind) params.set("kind", filter.kind);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/library/options?${params}`, { signal: controller.signal })
        .then((res) => res.json())
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
  }, [query, filter, locale]);

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <LibraryCatalogue
        locale={locale}
        mode="browse"
        rows={rows}
        facets={facets || undefined}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        totalCount={matchCount}
        emptyLabel={loading ? "Loading standards…" : "No published standards match this selection."}
      />
    </div>
  );
}
