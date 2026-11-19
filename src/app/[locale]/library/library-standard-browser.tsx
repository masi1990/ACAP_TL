"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CountryMark } from "@/components/country-mark";
import type { Locale } from "@/lib/i18n";
import { STANDARD_KINDS, standardKindLabel } from "@/lib/standard-kinds";

export type LibraryStandardRow = {
  id: string;
  designation: string;
  title: string;
  kind: string;
  sectorId: string;
  sectorCode: string;
  sectorName: string;
  committeeId: string;
  committeeCode: string;
  committeeName: string;
  committeeScope?: string;
  secretariatName?: string;
  secretariatIso2?: string;
  languages?: { code: string; href: string }[];
  /** True when the latest published version has a source PDF to read text from. */
  hasText: boolean;
};

export type LibraryCommitteeFacet = {
  id: string;
  code: string;
  name: string;
  sectorId: string;
  scope: string;
  secretariatName: string;
  secretariatIso2: string;
};

export type LibraryFacet = {
  sectors: { id: string; code: string; name: string }[];
  committees: LibraryCommitteeFacet[];
  counts: { sectorId: string; committeeId: string; kind: string; count: number }[];
};

type Filter = { sectorId: string; committeeId: string; kind: string };

type Tone = { solid: string; soft: string; ink: string };

const SECTOR_TONES: Tone[] = [
  { solid: "#0f2a24", soft: "#e7f2ec", ink: "#0f2a24" },
  { solid: "#1f6b54", soft: "#e5f4ee", ink: "#14543f" },
  { solid: "#0e4d6c", soft: "#e6f2f7", ink: "#0e4d6c" },
  { solid: "#8a5a22", soft: "#f8f1e4", ink: "#6d4618" },
  { solid: "#6a3d5c", soft: "#f7eef3", ink: "#6a3d5c" },
  { solid: "#3e5a2f", soft: "#eef4e8", ink: "#3e5a2f" },
  { solid: "#1e3a5f", soft: "#e8eef6", ink: "#1e3a5f" },
  { solid: "#7a3b2e", soft: "#f8ece8", ink: "#7a3b2e" },
];

const COMMITTEE_TONES: Tone[] = [
  { solid: "#245c74", soft: "#e7f3f7", ink: "#1b4658" },
  { solid: "#2f6f62", soft: "#e7f4f1", ink: "#24564c" },
  { solid: "#3d5a8a", soft: "#e9eef6", ink: "#31486f" },
  { solid: "#6d5a2e", soft: "#f6f2e7", ink: "#564722" },
  { solid: "#5c4d73", soft: "#f2eef6", ink: "#4a3e5d" },
  { solid: "#3f6b4a", soft: "#eaf3ec", ink: "#31543a" },
];

const KIND_TONES: Record<string, Tone> = {
  PRODUCT: { solid: "#1f6b54", soft: "#e7f3ee", ink: "#14543f" },
  SERVICE: { solid: "#8a6232", soft: "#f8f1e6", ink: "#6d4c24" },
  TESTING: { solid: "#1d5f8a", soft: "#e7f1f8", ink: "#164a6c" },
  REFERENCE: { solid: "#5b3d7a", soft: "#f3eef8", ink: "#4a3164" },
};

function toneAt(palette: Tone[], index: number) {
  return palette[index % palette.length];
}

function kindTone(kind: string): Tone {
  return KIND_TONES[kind] || { solid: "#4d5c56", soft: "#eef2f0", ink: "#2d3a36" };
}

function kindRank(kind: string) {
  const index = STANDARD_KINDS.findIndex((item) => item.value === kind);
  return index === -1 ? 99 : index;
}

function byCode<T extends { code: string; name: string }>(a: T, b: T) {
  if (!a.code && b.code) return 1;
  if (a.code && !b.code) return -1;
  return a.code.localeCompare(b.code) || a.name.localeCompare(b.name);
}

function facetsFromRows(rows: LibraryStandardRow[]): LibraryFacet {
  const sectors = new Map<string, LibraryFacet["sectors"][number]>();
  const committees = new Map<string, LibraryFacet["committees"][number]>();
  const counts = new Map<string, LibraryFacet["counts"][number]>();
  for (const row of rows) {
    sectors.set(row.sectorId, { id: row.sectorId, code: row.sectorCode, name: row.sectorName });
    committees.set(row.committeeId, {
      id: row.committeeId,
      code: row.committeeCode,
      name: row.committeeName,
      sectorId: row.sectorId,
      scope: row.committeeScope || "",
      secretariatName: row.secretariatName || "",
      secretariatIso2: row.secretariatIso2 || "",
    });
    const key = `${row.sectorId}|${row.committeeId}|${row.kind}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { sectorId: row.sectorId, committeeId: row.committeeId, kind: row.kind, count: 1 });
  }
  return {
    sectors: [...sectors.values()].sort(byCode),
    committees: [...committees.values()].sort(byCode),
    counts: [...counts.values()],
  };
}

function sumCounts(counts: LibraryFacet["counts"], pred: (row: LibraryFacet["counts"][number]) => boolean) {
  return counts.reduce((total, row) => total + (pred(row) ? row.count : 0), 0);
}

function TabButton({
  active,
  tone,
  label,
  count,
  onClick,
}: {
  active: boolean;
  tone: Tone;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-sm"
      style={
        active
          ? { background: tone.solid, color: "#f7faf7", borderColor: tone.solid }
          : { background: tone.soft, color: tone.ink, borderColor: tone.solid }
      }
    >
      {label}
      <span className="ms-1.5 rounded-full bg-white/25 px-1.5 text-xs" style={active ? undefined : { background: "transparent" }}>
        {count}
      </span>
    </button>
  );
}

export function LibraryStandardBrowser({
  rows,
  facets,
  filter,
  onFilter,
  action,
  locale,
  emptyLabel = "No standards are listed for this technical committee.",
}: {
  rows: LibraryStandardRow[];
  facets?: LibraryFacet;
  filter?: Filter;
  onFilter?: (next: Filter) => void;
  action?: (row: LibraryStandardRow) => ReactNode;
  locale: Locale;
  emptyLabel?: string;
}) {
  const [view, setView] = useState<"sectors" | "analysis">("sectors");
  const [openCommitteeId, setOpenCommitteeId] = useState("");
  const [localFilter, setLocalFilter] = useState<Filter>({ sectorId: "", committeeId: "", kind: "" });
  const current = filter || localFilter;
  const catalogue = useMemo(() => facets || facetsFromRows(rows), [facets, rows]);

  function apply(next: Filter) {
    if (onFilter) onFilter(next);
    else setLocalFilter(next);
  }

  function chooseSector(id: string) {
    setOpenCommitteeId("");
    apply({ sectorId: current.sectorId === id ? "" : id, committeeId: "", kind: "" });
  }

  const openSector = catalogue.sectors.find((sector) => sector.id === current.sectorId) || null;
  const sectorCommittees = catalogue.committees.filter((committee) => committee.sectorId === current.sectorId).sort(byCode);

  function standardCount(committeeId: string) {
    return sumCounts(catalogue.counts, (row) => row.committeeId === committeeId);
  }

  function kindBreakdown(committeeId: string) {
    const totals = new Map<string, number>();
    for (const row of catalogue.counts) {
      if (row.committeeId !== committeeId) continue;
      totals.set(row.kind, (totals.get(row.kind) || 0) + row.count);
    }
    return [...totals.entries()].sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]));
  }

  const categoryTotals = new Map<string, number>();
  for (const row of catalogue.counts) categoryTotals.set(row.kind, (categoryTotals.get(row.kind) || 0) + row.count);
  const tcTotal = catalogue.committees.length;
  const standardTotal = catalogue.counts.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Library views">
        <button
          type="button"
          role="tab"
          aria-selected={view === "sectors"}
          className="rounded-full px-4 py-2 text-sm"
          style={view === "sectors" ? { background: "#0f2a24", color: "#f7faf7" } : { background: "#e7f2ec", color: "#0f2a24" }}
          onClick={() => setView("sectors")}
        >
          Sectors
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "analysis"}
          className="rounded-full px-4 py-2 text-sm"
          style={view === "analysis" ? { background: "#0e4d6c", color: "#f7faf7" } : { background: "#e6f2f7", color: "#0e4d6c" }}
          onClick={() => setView("analysis")}
        >
          Analysis
        </button>
      </div>

      {view === "analysis" ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#0f2a24] px-4 py-3 text-[#f7faf7]">
              <p className="text-xs uppercase tracking-[0.12em]">Sectors</p>
              <p className="text-3xl">{catalogue.sectors.length}</p>
            </div>
            <div className="rounded-2xl bg-[#245c74] px-4 py-3 text-[#f7faf7]">
              <p className="text-xs uppercase tracking-[0.12em]">Technical committees</p>
              <p className="text-3xl">{tcTotal}</p>
            </div>
            <div className="rounded-2xl bg-[#1f6b54] px-4 py-3 text-[#f7faf7]">
              <p className="text-xs uppercase tracking-[0.12em]">Standards</p>
              <p className="text-3xl">{standardTotal}</p>
            </div>
          </div>
          <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Standards by category</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...categoryTotals.entries()]
                .sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]))
                .map(([kind, count]) => (
                  <span key={kind} className="rounded-full px-3 py-1 text-sm text-white" style={{ background: kindTone(kind).solid }}>
                    {standardKindLabel(kind, locale)} · {count}
                  </span>
                ))}
            </div>
          </section>
          {catalogue.sectors.map((sector, index) => {
            const tone = toneAt(SECTOR_TONES, index);
            const committees = catalogue.committees.filter((committee) => committee.sectorId === sector.id);
            const standards = committees.reduce((sum, committee) => sum + standardCount(committee.id), 0);
            return (
              <section key={sector.id} className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: tone.solid }}>
                <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3" style={{ background: tone.solid, color: "#f7faf7" }}>
                  <h3 className="text-lg">{sector.code ? `${sector.code} — ${sector.name}` : sector.name}</h3>
                  <p className="text-sm">
                    {committees.length} TCs · {standards} standards
                  </p>
                </header>
                <ul className="divide-y divide-[var(--line)]">
                  {committees.map((committee) => (
                    <li key={committee.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center">
                      <div>
                        <p>
                          <span className="font-mono">{committee.code}</span> {committee.name}
                        </p>
                        {committee.scope ? <p className="mt-1 text-sm text-[var(--muted)]">{committee.scope}</p> : null}
                      </div>
                      <div className="text-sm">
                        {committee.secretariatIso2 || committee.secretariatName ? (
                          <CountryMark iso2={committee.secretariatIso2} name={committee.secretariatName} />
                        ) : (
                          <span className="text-[var(--muted)]">No secretariat yet</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-full bg-[#245c74] px-2 py-0.5 text-xs text-white">{standardCount(committee.id)} standards</span>
                        {kindBreakdown(committee.id).map(([kind, count]) => (
                          <span key={kind} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: kindTone(kind).solid }}>
                            {standardKindLabel(kind, locale)} {count}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sectors">
            {catalogue.sectors.map((sector, index) => (
              <TabButton
                key={sector.id}
                active={current.sectorId === sector.id}
                tone={toneAt(SECTOR_TONES, index)}
                label={sector.code ? `${sector.code} ${sector.name}` : sector.name}
                count={catalogue.committees.filter((committee) => committee.sectorId === sector.id).length}
                onClick={() => chooseSector(sector.id)}
              />
            ))}
          </div>
          {!openSector ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              Choose a sector to see its technical committees.
            </p>
          ) : (
            <section className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: toneAt(SECTOR_TONES, Math.max(0, catalogue.sectors.findIndex((sector) => sector.id === openSector.id))).solid }}>
              <header className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3 text-[#f7faf7]" style={{ background: toneAt(SECTOR_TONES, Math.max(0, catalogue.sectors.findIndex((sector) => sector.id === openSector.id))).solid }}>
                <h3 className="font-[family-name:var(--font-display)] text-xl">
                  {openSector.code ? `${openSector.code} — ${openSector.name}` : openSector.name}
                </h3>
                <p className="text-sm">
                  {sectorCommittees.length} technical committee{sectorCommittees.length === 1 ? "" : "s"}
                  {" · "}
                  {sectorCommittees.reduce((sum, committee) => sum + standardCount(committee.id), 0)} standards
                </p>
              </header>
              <div className="grid gap-3 p-4">
                {sectorCommittees.length === 0 ? <p className="text-sm text-[var(--muted)]">This sector has no technical committees yet.</p> : null}
                {sectorCommittees.map((committee, index) => {
                  const tone = toneAt(COMMITTEE_TONES, index);
                  const open = openCommitteeId === committee.id;
                  const listed = rows.filter((row) => row.committeeId === committee.id);
                  return (
                    <article key={committee.id} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: tone.solid }}>
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
                        style={{ background: tone.soft, color: tone.ink }}
                        aria-expanded={open}
                        onClick={() => setOpenCommitteeId(open ? "" : committee.id)}
                      >
                        <span>
                          <span className="font-mono font-medium">{committee.code}</span> {committee.name}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-sm">
                          {committee.secretariatIso2 || committee.secretariatName ? (
                            <CountryMark iso2={committee.secretariatIso2} name={committee.secretariatName} />
                          ) : null}
                          <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: tone.solid }}>
                            {standardCount(committee.id)} standards
                          </span>
                        </span>
                      </button>
                      <div className="grid gap-2 px-4 py-3">
                        {committee.scope ? <p className="text-sm">{committee.scope}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          {kindBreakdown(committee.id).map(([kind, count]) => (
                            <span key={kind} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: kindTone(kind).solid }}>
                              {standardKindLabel(kind, locale)} {count}
                            </span>
                          ))}
                        </div>
                        {open ? (
                          listed.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">{emptyLabel}</p>
                          ) : (
                            <>
                            <ul className="grid gap-2 md:hidden">
                              {listed.map((row) => (
                                <li key={row.id} className="rounded-xl border bg-white p-3" style={{ borderColor: tone.solid }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-mono">{row.designation}</p>
                                    {action ? action(row) : null}
                                  </div>
                                  <p className="mt-1">{row.title}</p>
                                  <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs text-white" style={{ background: kindTone(row.kind).solid }}>
                                    {standardKindLabel(row.kind, locale)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="hidden overflow-x-auto rounded-xl border bg-white md:block" style={{ borderColor: tone.solid }}>
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="text-left" style={{ background: tone.soft, color: tone.ink }}>
                                    <th className="px-3 py-2 font-semibold">Designation</th>
                                    <th className="px-3 py-2 font-semibold">Title</th>
                                    <th className="px-3 py-2 font-semibold">Category</th>
                                    {action ? <th className="px-3 py-2" /> : null}
                                  </tr>
                                </thead>
                                <tbody>
                                  {listed.map((row) => (
                                    <tr key={row.id} className="border-t border-[var(--line)]">
                                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.designation}</td>
                                      <td className="px-3 py-2">{row.title}</td>
                                      <td className="px-3 py-2">
                                        <span className="inline-block rounded-full px-2 py-0.5 text-xs text-white" style={{ background: kindTone(row.kind).solid }}>
                                          {standardKindLabel(row.kind, locale)}
                                        </span>
                                      </td>
                                      {action ? <td className="px-3 py-2 text-end">{action(row)}</td> : null}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            </>
                          )
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function LibraryHoldings({ rows, locale }: { rows: LibraryStandardRow[]; locale: Locale }) {
  return (
    <LibraryStandardBrowser
      rows={rows}
      locale={locale}
      emptyLabel="No standards are released to you in this technical committee."
      action={(row) => (
        <div className="flex flex-wrap justify-end gap-1">
          {(row.languages || []).map((language) => (
            <a key={language.code} href={language.href} className="rounded-md px-2 py-1 text-xs text-white" style={{ background: "#1f6b54" }}>
              {language.code.toUpperCase()}
            </a>
          ))}
        </div>
      )}
    />
  );
}
