"use client";

import { useMemo, useState } from "react";
import { byCode, sumCounts, toneAt, SECTOR_TONES, type LibraryFacet, type LibraryFilter } from "./library-types";

function matches(query: string, ...parts: string[]) {
  return parts.some((part) => part.toLowerCase().includes(query));
}

export function LibrarySidebar({
  catalogue,
  filter,
  onFilter,
}: {
  catalogue: LibraryFacet;
  filter: LibraryFilter;
  onFilter: (next: LibraryFilter) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(filter.sectorId ? [filter.sectorId] : []));
  const [seenSector, setSeenSector] = useState(filter.sectorId);

  // When the filter changes elsewhere (e.g. Analysis), open that sector here.
  if (seenSector !== filter.sectorId) {
    setSeenSector(filter.sectorId);
    if (filter.sectorId && !expanded.has(filter.sectorId)) setExpanded(new Set(expanded).add(filter.sectorId));
  }

  const needle = query.trim().toLowerCase();
  const total = useMemo(() => catalogue.counts.reduce((sum, row) => sum + row.count, 0), [catalogue.counts]);

  const tree = useMemo(() => {
    return catalogue.sectors
      .map((sector, index) => {
        const committees = catalogue.committees.filter((committee) => committee.sectorId === sector.id).sort(byCode);
        const sectorHit = !needle || matches(needle, sector.code, sector.name);
        const shown = needle && !sectorHit ? committees.filter((committee) => matches(needle, committee.code, committee.name)) : committees;
        return { sector, index, committees: shown, visible: sectorHit || shown.length > 0 };
      })
      .filter((entry) => entry.visible);
  }, [catalogue.sectors, catalogue.committees, needle]);

  function toggleSector(id: string) {
    const next = new Set(expanded);
    if (needle !== "") {
      next.add(id);
      setExpanded(next);
      onFilter({ sectorId: id, committeeId: "", kind: "" });
      return;
    }
    if (expanded.has(id)) {
      next.delete(id);
      setExpanded(next);
      if (filter.sectorId === id) onFilter({ sectorId: "", committeeId: "", kind: "" });
    } else {
      next.add(id);
      setExpanded(next);
      onFilter({ sectorId: id, committeeId: "", kind: "" });
    }
  }

  return (
    <nav aria-label="Sectors and technical committees" className="grid content-start gap-2 rounded-2xl border border-[var(--line)] bg-white p-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find sector or TC"
        aria-label="Find sector or technical committee"
        className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        aria-pressed={!filter.sectorId && !filter.committeeId}
        onClick={() => onFilter({ sectorId: "", committeeId: "", kind: filter.kind })}
        className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
          !filter.sectorId && !filter.committeeId ? "bg-[var(--surface-2)] font-medium" : "hover:bg-[var(--surface-2)]"
        }`}
      >
        <span>All standards</span>
        <span className="rounded-full bg-[var(--surface-2)] px-2 text-xs">{total}</span>
      </button>
      {tree.length === 0 ? <p className="px-2 text-sm text-[var(--muted)]">No sector or TC matches.</p> : null}
      <ul className="grid gap-1">
        {tree.map(({ sector, index, committees }) => {
          const open = expanded.has(sector.id) || (needle !== "" && committees.length > 0);
          const tone = toneAt(SECTOR_TONES, index);
          const sectorCount = sumCounts(catalogue.counts, (row) => row.sectorId === sector.id);
          const tcCount = catalogue.committees.filter((committee) => committee.sectorId === sector.id).length;
          return (
            <li key={sector.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggleSector(sector.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                style={filter.sectorId === sector.id && !filter.committeeId ? { background: tone.soft, color: tone.ink } : undefined}
              >
                <span aria-hidden className="w-3 font-mono text-xs">
                  {open ? "▾" : "▸"}
                </span>
                <span className="flex-1 text-left">
                  {sector.code ? <span className="font-mono">{sector.code}</span> : null} {sector.name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs text-white"
                  style={{ background: tone.solid }}
                  title={`${tcCount} technical committee${tcCount === 1 ? "" : "s"}`}
                >
                  {sectorCount}
                </span>
              </button>
              {open ? (
                <ul className="ms-5 mt-1 grid gap-0.5 border-s border-[var(--line)] ps-2">
                  {committees.length === 0 ? <li className="px-2 py-1 text-xs text-[var(--muted)]">No technical committees.</li> : null}
                  {committees.map((committee) => {
                    const selected = filter.committeeId === committee.id;
                    const count = sumCounts(catalogue.counts, (row) => row.committeeId === committee.id);
                    return (
                      <li key={committee.id}>
                        <button
                          type="button"
                          aria-current={selected ? "true" : undefined}
                          onClick={() => onFilter({ sectorId: sector.id, committeeId: selected ? "" : committee.id, kind: filter.kind })}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-[var(--surface-2)]"
                          style={selected ? { background: tone.soft, color: tone.ink, fontWeight: 600 } : undefined}
                        >
                          <span className="flex-1">
                            <span className="font-mono">{committee.code}</span> {committee.name}
                          </span>
                          <span className="text-xs text-[var(--muted)]">{count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
