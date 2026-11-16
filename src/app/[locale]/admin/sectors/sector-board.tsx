"use client";

import { useState } from "react";
import { CrudForm, DeleteButton } from "@/components/admin/crud-form";
import { CountryMark } from "@/components/country-mark";
import type { Locale } from "@/lib/i18n";
import { STANDARD_KINDS, standardKindLabel } from "@/lib/standard-kinds";

export type SectorBoardCommittee = {
  id: string;
  code: string;
  name: string;
  scope: string;
  sectorId: string;
  standardCount: number;
  byKind: { kind: string; count: number }[];
  secretariat: { id: string; iso2: string; name: string } | null;
};

export type SectorBoardSector = {
  id: string;
  code: string;
  name: string;
  committees: SectorBoardCommittee[];
};

const SECTOR_COLORS = ["#0f2a24", "#1f6b54", "#0e4d6c", "#8a5a22", "#6a3d5c", "#3e5a2f", "#1e3a5f", "#7a3b2e"];

function kindRank(kind: string) {
  const index = STANDARD_KINDS.findIndex((item) => item.value === kind);
  return index === -1 ? 99 : index;
}

export function SectorBoard({
  locale,
  sectors,
  countries,
  canWrite,
  canDelete,
}: {
  locale: Locale;
  sectors: SectorBoardSector[];
  countries: { id: string; iso2: string; name: string }[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [view, setView] = useState<"sectors" | "analysis">("sectors");
  const [openSectorId, setOpenSectorId] = useState("");
  const [openCommitteeId, setOpenCommitteeId] = useState("");
  const countryOptions = countries.map((country) => ({
    value: country.id,
    label: `${country.name} (${country.iso2})`,
  }));
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: `${sector.code} — ${sector.name}` }));
  const openSector = sectors.find((sector) => sector.id === openSectorId) || null;

  const categoryTotals = new Map<string, number>();
  for (const sector of sectors) {
    for (const committee of sector.committees) {
      for (const item of committee.byKind) {
        categoryTotals.set(item.kind, (categoryTotals.get(item.kind) || 0) + item.count);
      }
    }
  }

  function committeeFields(committee?: SectorBoardCommittee) {
    return [
      {
        name: "sectorId",
        label: "Sector",
        type: "select" as const,
        required: true,
        defaultValue: committee?.sectorId,
        options: sectorOptions,
      },
      { name: "code", label: "Committee code", required: true, defaultValue: committee?.code, placeholder: "TC-01" },
      { name: "name", label: "Committee name", required: true, defaultValue: committee?.name, placeholder: "Cereals and pulses" },
      {
        name: "scope",
        label: "Committee scope",
        type: "textarea" as const,
        defaultValue: committee?.scope || "",
        placeholder: "What this technical committee is responsible for",
      },
      {
        name: "secretariatMemberStateId",
        label: "TC secretariat",
        type: "select" as const,
        defaultValue: committee?.secretariat?.id || "",
        options: countryOptions,
        help: "African country that leads this committee",
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sector views">
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
        <Analysis sectors={sectors} locale={locale} categoryTotals={categoryTotals} />
      ) : (
        <div className="space-y-6">
          {canWrite ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Add sector</h3>
                <CrudForm
                  action="/api/admin/sectors"
                  submitLabel="Add sector"
                  fields={[
                    { name: "code", label: "Sector code", required: true, placeholder: "FOOD" },
                    { name: "name", label: "Sector name", required: true, placeholder: "Food and agriculture" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Add technical committee</h3>
                <CrudForm
                  action="/api/admin/committees"
                  submitLabel="Add committee"
                  fields={committeeFields()}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sectors">
            {sectors.map((sector, index) => {
              const color = SECTOR_COLORS[index % SECTOR_COLORS.length];
              const active = openSectorId === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  aria-expanded={active}
                  className="rounded-full border px-3 py-1.5 text-sm"
                  style={active ? { background: color, color: "#f7faf7", borderColor: color } : { background: "#f7faf7", color, borderColor: color }}
                  onClick={() => {
                    setOpenSectorId(active ? "" : sector.id);
                    setOpenCommitteeId("");
                  }}
                >
                  {sector.code} {sector.name}
                  <span className="ms-2 text-xs">{sector.committees.length} TCs</span>
                </button>
              );
            })}
          </div>

          {!openSector ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              {sectors.length ? "Choose a sector to see its technical committees." : "No sectors yet. Add a sector, then add its technical committees."}
            </p>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              <header className="flex flex-wrap items-baseline justify-between gap-3 bg-[#0f2a24] px-4 py-3 text-[#f7faf7]">
                <h3 className="font-[family-name:var(--font-display)] text-xl">
                  {openSector.code} — {openSector.name}
                </h3>
                <p className="text-sm">
                  {openSector.committees.length} technical committee{openSector.committees.length === 1 ? "" : "s"}
                  {" · "}
                  {openSector.committees.reduce((sum, committee) => sum + committee.standardCount, 0)} standards
                </p>
              </header>
              <div className="grid gap-3 p-4">
                {canWrite ? (
                  <CrudForm
                    action={`/api/admin/sectors/${openSector.id}`}
                    method="PATCH"
                    idPrefix={`${openSector.id}-`}
                    submitLabel="Save sector"
                    fields={[
                      { name: "code", label: "Sector code", required: true, defaultValue: openSector.code },
                      { name: "name", label: "Sector name", required: true, defaultValue: openSector.name },
                    ]}
                  />
                ) : null}
                {canDelete ? <DeleteButton action={`/api/admin/sectors/${openSector.id}`} /> : null}
                {openSector.committees.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">This sector has no technical committees yet.</p>
                ) : (
                  openSector.committees.map((committee) => {
                    const open = openCommitteeId === committee.id;
                    return (
                      <article key={committee.id} className="rounded-xl border border-[#245c74]/40 bg-[#f4fafb]">
                        <button
                          type="button"
                          className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
                          aria-expanded={open}
                          onClick={() => setOpenCommitteeId(open ? "" : committee.id)}
                        >
                          <span>
                            <span className="font-mono font-medium">{committee.code}</span>
                            <span> — {committee.name}</span>
                          </span>
                          <span className="flex flex-wrap items-center gap-3 text-sm">
                            {committee.secretariat ? (
                              <CountryMark iso2={committee.secretariat.iso2} name={committee.secretariat.name} />
                            ) : (
                              <span className="text-[var(--muted)]">No secretariat yet</span>
                            )}
                            <span className="rounded-full bg-[#245c74] px-2 py-0.5 text-xs text-white">
                              {committee.standardCount} standard{committee.standardCount === 1 ? "" : "s"}
                            </span>
                          </span>
                        </button>
                        <div className="flex flex-wrap gap-2 px-4 pb-3">
                          {committee.byKind.map((item) => (
                            <span key={item.kind} className="rounded-full bg-white px-2 py-0.5 text-xs">
                              {standardKindLabel(item.kind, locale)} {item.count}
                            </span>
                          ))}
                        </div>
                        {open ? (
                          <div className="grid gap-3 border-t border-[#245c74]/20 px-4 py-3">
                            <p className="text-sm">
                              {committee.scope || <span className="text-[var(--muted)]">No scope recorded yet.</span>}
                            </p>
                            {canWrite ? (
                              <CrudForm
                                action={`/api/admin/committees/${committee.id}`}
                                method="PATCH"
                                idPrefix={`${committee.id}-`}
                                submitLabel="Save committee"
                                fields={committeeFields(committee)}
                              />
                            ) : null}
                            {canDelete ? <DeleteButton action={`/api/admin/committees/${committee.id}`} /> : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Analysis({
  sectors,
  locale,
  categoryTotals,
}: {
  sectors: SectorBoardSector[];
  locale: Locale;
  categoryTotals: Map<string, number>;
}) {
  const kinds = [...categoryTotals.entries()].sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]));
  const tcTotal = sectors.reduce((sum, sector) => sum + sector.committees.length, 0);
  const standardTotal = sectors.reduce(
    (sum, sector) => sum + sector.committees.reduce((inner, committee) => inner + committee.standardCount, 0),
    0,
  );
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Sectors" value={sectors.length} color="#0f2a24" />
        <Stat label="Technical committees" value={tcTotal} color="#245c74" />
        <Stat label="Standards" value={standardTotal} color="#1f6b54" />
      </div>
      <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Standards by category</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {kinds.length === 0 ? <p className="text-sm text-[var(--muted)]">No standards yet.</p> : null}
          {kinds.map(([kind, count]) => (
            <span key={kind} className="rounded-full bg-[#e7f3ee] px-3 py-1 text-sm text-[#14543f]">
              {standardKindLabel(kind, locale)} · {count}
            </span>
          ))}
        </div>
      </section>
      <div className="grid gap-4">
        {sectors.map((sector, index) => {
          const color = SECTOR_COLORS[index % SECTOR_COLORS.length];
          const standards = sector.committees.reduce((sum, committee) => sum + committee.standardCount, 0);
          return (
            <section key={sector.id} className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: color }}>
              <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-[#f7faf7]" style={{ background: color }}>
                <h3 className="text-lg">
                  {sector.code} — {sector.name}
                </h3>
                <p className="text-sm">
                  {sector.committees.length} TCs · {standards} standards
                </p>
              </header>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                    <th className="px-4 py-2 font-semibold">Technical committee</th>
                    <th className="px-4 py-2 font-semibold">Secretariat</th>
                    <th className="px-4 py-2 font-semibold">Standards</th>
                    <th className="px-4 py-2 font-semibold">By category</th>
                  </tr>
                </thead>
                <tbody>
                  {sector.committees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-[var(--muted)]">
                        No technical committees.
                      </td>
                    </tr>
                  ) : (
                    sector.committees.map((committee) => (
                      <tr key={committee.id} className="border-b border-[var(--line)]/60">
                        <td className="px-4 py-3">
                          <span className="font-mono">{committee.code}</span> — {committee.name}
                        </td>
                        <td className="px-4 py-3">
                          {committee.secretariat ? (
                            <CountryMark iso2={committee.secretariat.iso2} name={committee.secretariat.name} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">{committee.standardCount}</td>
                        <td className="px-4 py-3">
                          {committee.byKind.map((item) => `${standardKindLabel(item.kind, locale)} ${item.count}`).join(" · ") || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl px-4 py-3 text-[#f7faf7]" style={{ background: color }}>
      <p className="text-xs uppercase tracking-[0.12em]">{label}</p>
      <p className="text-3xl">{value}</p>
    </div>
  );
}
