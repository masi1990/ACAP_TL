import { STANDARD_KINDS } from "@/lib/standard-kinds";

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

export type LibraryFilter = { sectorId: string; committeeId: string; kind: string };

export type Tone = { solid: string; soft: string; ink: string };

export const SECTOR_TONES: Tone[] = [
  { solid: "#0f2a24", soft: "#e7f2ec", ink: "#0f2a24" },
  { solid: "#1f6b54", soft: "#e5f4ee", ink: "#14543f" },
  { solid: "#0e4d6c", soft: "#e6f2f7", ink: "#0e4d6c" },
  { solid: "#8a5a22", soft: "#f8f1e4", ink: "#6d4618" },
  { solid: "#6a3d5c", soft: "#f7eef3", ink: "#6a3d5c" },
  { solid: "#3e5a2f", soft: "#eef4e8", ink: "#3e5a2f" },
  { solid: "#1e3a5f", soft: "#e8eef6", ink: "#1e3a5f" },
  { solid: "#7a3b2e", soft: "#f8ece8", ink: "#7a3b2e" },
];

export const COMMITTEE_TONES: Tone[] = [
  { solid: "#245c74", soft: "#e7f3f7", ink: "#1b4658" },
  { solid: "#2f6f62", soft: "#e7f4f1", ink: "#24564c" },
  { solid: "#3d5a8a", soft: "#e9eef6", ink: "#31486f" },
  { solid: "#6d5a2e", soft: "#f6f2e7", ink: "#564722" },
  { solid: "#5c4d73", soft: "#f2eef6", ink: "#4a3e5d" },
  { solid: "#3f6b4a", soft: "#eaf3ec", ink: "#31543a" },
];

export const KIND_TONES: Record<string, Tone> = {
  PRODUCT: { solid: "#1f6b54", soft: "#e7f3ee", ink: "#14543f" },
  SERVICE: { solid: "#8a6232", soft: "#f8f1e6", ink: "#6d4c24" },
  TESTING: { solid: "#1d5f8a", soft: "#e7f1f8", ink: "#164a6c" },
  REFERENCE: { solid: "#5b3d7a", soft: "#f3eef8", ink: "#4a3164" },
};

export function toneAt(palette: Tone[], index: number) {
  return palette[index % palette.length];
}

export function kindTone(kind: string): Tone {
  return KIND_TONES[kind] || { solid: "#4d5c56", soft: "#eef2f0", ink: "#2d3a36" };
}

export function kindRank(kind: string) {
  const index = STANDARD_KINDS.findIndex((item) => item.value === kind);
  return index === -1 ? 99 : index;
}

export function byCode<T extends { code: string; name: string }>(a: T, b: T) {
  if (!a.code && b.code) return 1;
  if (a.code && !b.code) return -1;
  return a.code.localeCompare(b.code) || a.name.localeCompare(b.name);
}

export function facetsFromRows(rows: LibraryStandardRow[]): LibraryFacet {
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

export function sumCounts(counts: LibraryFacet["counts"], pred: (row: LibraryFacet["counts"][number]) => boolean) {
  return counts.reduce((total, row) => total + (pred(row) ? row.count : 0), 0);
}
