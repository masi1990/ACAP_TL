"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CountryMark } from "@/components/country-mark";
import type { Locale } from "@/lib/i18n";
import { standardKindLabel } from "@/lib/standard-kinds";
import { kindRank, kindTone, type LibraryFacet, type LibraryFilter, type LibraryStandardRow } from "./library-types";

const PAGE = 100;

export function LibraryStandardsTable({
  locale,
  rows,
  catalogue,
  filter,
  onFilter,
  action,
  emptyLabel,
  query,
  onQuery,
  showSearch,
}: {
  locale: Locale;
  rows: LibraryStandardRow[];
  catalogue: LibraryFacet;
  filter: LibraryFilter;
  onFilter: (next: LibraryFilter) => void;
  action?: (row: LibraryStandardRow) => ReactNode;
  emptyLabel: string;
  /** When the parent owns the query (server search) pass both; rows are then not text-filtered here. */
  query?: string;
  onQuery?: (value: string) => void;
  showSearch: boolean;
}) {
  const [localQuery, setLocalQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const parentOwnsQuery = onQuery != null;
  const text = (parentOwnsQuery ? query || "" : localQuery).trim().toLowerCase();

  const scoped = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!filter.sectorId || row.sectorId === filter.sectorId) && (!filter.committeeId || row.committeeId === filter.committeeId),
      ),
    [rows, filter.sectorId, filter.committeeId],
  );

  const kinds = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of scoped) totals.set(row.kind, (totals.get(row.kind) || 0) + 1);
    return [...totals.entries()].sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]));
  }, [scoped]);

  const visible = useMemo(
    () =>
      scoped.filter((row) => {
        if (filter.kind && row.kind !== filter.kind) return false;
        if (!parentOwnsQuery && text) return row.designation.toLowerCase().includes(text) || row.title.toLowerCase().includes(text);
        return true;
      }),
    [scoped, filter.kind, parentOwnsQuery, text],
  );
  const shown = visible.slice(0, limit);

  const committee = filter.committeeId ? catalogue.committees.find((item) => item.id === filter.committeeId) : null;
  const sector = filter.sectorId ? catalogue.sectors.find((item) => item.id === filter.sectorId) : null;

  return (
    <section className="grid content-start gap-3">
      <header className="grid gap-1">
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          {committee
            ? `${committee.code} ${committee.name}`
            : sector
              ? sector.code
                ? `${sector.code} — ${sector.name}`
                : sector.name
              : "All standards"}
        </h3>
        {committee ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            {committee.secretariatIso2 || committee.secretariatName ? (
              <CountryMark iso2={committee.secretariatIso2} name={committee.secretariatName} />
            ) : null}
            {committee.scope ? <span>{committee.scope}</span> : null}
          </div>
        ) : null}
      </header>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-[var(--background,white)] py-2">
        {showSearch || parentOwnsQuery ? (
          <input
            type="search"
            value={parentOwnsQuery ? query || "" : localQuery}
            onChange={(event) => {
              if (parentOwnsQuery) onQuery?.(event.target.value);
              else {
                setLocalQuery(event.target.value);
                setLimit(PAGE);
              }
            }}
            placeholder="Search designation or title"
            aria-label="Search standards"
            className="min-w-48 flex-1 rounded-md border border-[var(--line)] px-3 py-1.5 text-sm"
          />
        ) : null}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
          <button
            type="button"
            aria-pressed={!filter.kind}
            onClick={() => onFilter({ ...filter, kind: "" })}
            className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-sm"
            style={!filter.kind ? { background: "#0f2a24", color: "#f7faf7" } : undefined}
          >
            All {scoped.length}
          </button>
          {kinds.map(([kind, count]) => {
            const tone = kindTone(kind);
            const active = filter.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => onFilter({ ...filter, kind: active ? "" : kind })}
                className="rounded-full border px-3 py-1 text-sm"
                style={
                  active
                    ? { background: tone.solid, color: "#f7faf7", borderColor: tone.solid }
                    : { background: tone.soft, color: tone.ink, borderColor: tone.solid }
                }
              >
                {standardKindLabel(kind, locale)} {count}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">{emptyLabel}</p>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {shown.map((row) => (
              <li key={row.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono">{row.designation}</p>
                  {action ? action(row) : null}
                </div>
                <p className="mt-1">{row.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <KindBadge kind={row.kind} locale={locale} />
                  <NoText row={row} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--line)] bg-white md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface-2)] text-left">
                  <th className="px-3 py-2 font-semibold">Designation</th>
                  <th className="px-3 py-2 font-semibold">Title</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  {action ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{row.designation}</td>
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <KindBadge kind={row.kind} locale={locale} />
                        <NoText row={row} />
                      </div>
                    </td>
                    {action ? <td className="px-3 py-2 text-end">{action(row)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>
              Showing {shown.length.toLocaleString()} of {visible.length.toLocaleString()}
            </span>
            {shown.length < visible.length ? (
              <button type="button" className="text-sm underline" onClick={() => setLimit((value) => value + PAGE)}>
                Show more
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function KindBadge({ kind, locale }: { kind: string; locale: Locale }) {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-xs text-white" style={{ background: kindTone(kind).solid }}>
      {standardKindLabel(kind, locale)}
    </span>
  );
}

function NoText({ row }: { row: LibraryStandardRow }) {
  return row.hasText === false ? (
    <span className="inline-block rounded-full bg-[#7a3b2e] px-2 py-0.5 text-xs text-white">No text</span>
  ) : null;
}
