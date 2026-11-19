"use client";

import type { Locale } from "@/lib/i18n";
import { standardKindLabel } from "@/lib/standard-kinds";
import { SECTOR_TONES, kindRank, kindTone, sumCounts, toneAt, type LibraryFacet, type LibraryStandardRow } from "./library-types";

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-[var(--surface-2)]">
      <div className="h-2 rounded-full" style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, background: color }} />
    </div>
  );
}

export function LibraryAnalysis({
  locale,
  rows,
  catalogue,
  onSelectSector,
}: {
  locale: Locale;
  rows: LibraryStandardRow[];
  catalogue: LibraryFacet;
  onSelectSector: (sectorId: string) => void;
}) {
  const standardTotal = catalogue.counts.reduce((sum, row) => sum + row.count, 0);
  const noText = rows.filter((row) => row.hasText === false).length;

  const categoryTotals = new Map<string, number>();
  for (const row of catalogue.counts) categoryTotals.set(row.kind, (categoryTotals.get(row.kind) || 0) + row.count);
  const categories = [...categoryTotals.entries()].sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]));
  const maxCategory = Math.max(1, ...categories.map(([, count]) => count));

  const sectors = catalogue.sectors.map((sector, index) => ({
    sector,
    index,
    count: sumCounts(catalogue.counts, (row) => row.sectorId === sector.id),
  }));
  const maxSector = Math.max(1, ...sectors.map((entry) => entry.count));

  const cards = [
    { label: "Sectors", value: catalogue.sectors.length, bg: "#0f2a24" },
    { label: "Technical committees", value: catalogue.committees.length, bg: "#245c74" },
    { label: "Standards", value: standardTotal, bg: "#1f6b54" },
    { label: "No text (loaded)", value: noText, bg: "#7a3b2e" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl px-4 py-3 text-[#f7faf7]" style={{ background: card.bg }}>
            <p className="text-xs uppercase tracking-[0.12em]">{card.label}</p>
            <p className="text-3xl">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Standards by category</h3>
        <ul className="mt-3 grid gap-3">
          {categories.map(([kind, count]) => (
            <li key={kind} className="grid gap-1">
              <div className="flex justify-between text-sm">
                <span>{standardKindLabel(kind, locale)}</span>
                <span className="font-mono">{count.toLocaleString()}</span>
              </div>
              <Bar pct={(count / maxCategory) * 100} color={kindTone(kind).solid} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Standards by sector</h3>
        <ul className="mt-3 grid gap-2">
          {sectors.map(({ sector, index, count }) => (
            <li key={sector.id}>
              <button
                type="button"
                onClick={() => onSelectSector(sector.id)}
                className="grid w-full gap-1 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface-2)]"
              >
                <span className="flex justify-between gap-3 text-sm">
                  <span>
                    {sector.code ? <span className="font-mono">{sector.code}</span> : null} {sector.name}
                  </span>
                  <span className="font-mono">{count.toLocaleString()}</span>
                </span>
                <Bar pct={(count / maxSector) * 100} color={toneAt(SECTOR_TONES, index).solid} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
