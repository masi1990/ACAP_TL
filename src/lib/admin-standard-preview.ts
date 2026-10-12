/**
 * Authenticated admin preview — full standard (all clauses), not the public Clause-1-only view.
 */
import { prisma } from "@/lib/db";
import { assessMachinePackCompleteness } from "@/lib/fidelity";
import {
  ensureStandardFullRasters,
  pagesFromManifest,
  tocFromMachineClauses,
} from "@/lib/preview-raster";
import { ars464TableOfContents } from "@/lib/standard-preview";
import type { PdfPreviewPage, PreviewPage, PreviewTocEntry } from "@/lib/standard-preview-types";

/** Deduplicate TOC rows that share the same number+title (avoids React key collisions). */
function uniqueToc(entries: PreviewTocEntry[]): PreviewTocEntry[] {
  const seen = new Set<string>();
  const out: PreviewTocEntry[] = [];
  for (const e of entries) {
    const key = `${e.number}\0${e.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...e, includedInPreview: true });
  }
  return out;
}

/** Full ARS 464 page set (all clauses) for authenticated admin preview */
function buildArs464FullAdminPages(basePath = "/standards/ars-464-2022/pages"): PdfPreviewPage[] {
  const labels: Record<number, string> = {
    1: "Cover",
    2: "Table of contents",
    3: "Foreword",
    4: "Copyright notice",
    5: "Introduction",
    6: "Blank separator",
    7: "1 Scope + start of Clause 2",
    8: "Body (Clause 2+)",
  };
  const pages: PdfPreviewPage[] = [];
  for (let n = 1; n <= 17; n++) {
    pages.push({
      n,
      label: labels[n] || `Page ${n}`,
      access: "free",
      imageUrl: `${basePath}/page-${String(n).padStart(2, "0")}.png`,
      note: "Full standard — authenticated admin preview",
    });
  }
  return pages;
}

type MachineDoc = {
  standard?: { technicalCommittee?: string; designation?: string; title?: { en?: string } };
  scope?: { text?: { en?: string } };
  normativeReferences?: unknown[];
  requirements?: Array<{ id?: string; clause?: string; text?: string }>;
  packaging?: unknown;
  labelling?: unknown;
  sampling?: unknown;
  contentHash?: string;
  clauses?: Array<{ number: string; title: string; body?: string }>;
  fullText?: string;
};

function isArs464(designation: string, editionLabel: string) {
  return /\bARS\s*464\b/i.test(`${designation} ${editionLabel}`);
}

function buildFullTextPages(input: {
  editionLabel: string;
  titleEn: string;
  ics: string;
  publisher: string;
  year: number;
  technicalCommittee?: string | null;
  scopeEn: string;
  clauses: Array<{ number: string; title: string; body?: string }>;
  fullText?: string;
}): PreviewPage[] {
  const pages: PreviewPage[] = [
    {
      id: "cover",
      label: "Cover",
      kind: "cover",
      content: {
        org: "AFRICAN ORGANISATION FOR STANDARDISATION",
        orgShort: "ARSO",
        documentType: "AFRICAN STANDARD",
        designation: input.editionLabel,
        title: input.titleEn,
        ics: input.ics,
        publisher: input.publisher,
        year: String(input.year),
        committee: input.technicalCommittee || "",
        legalNote: "Authenticated full-standard preview — all clauses visible to authorised roles.",
      },
    },
    {
      id: "toc",
      label: "Contents",
      kind: "toc",
      content: {
        heading: "Table of contents",
        note: `Full contents of ${input.editionLabel} (admin)`,
      },
    },
  ];

  if (input.clauses.length > 0) {
    input.clauses.forEach((c, idx) => {
      pages.push({
        id: `clause-${idx}-${c.number}`,
        label: `${c.number} ${c.title}`,
        kind: c.number === "1" || c.number.startsWith("1.") ? "scope" : "body",
        content: {
          heading: `${c.number} ${c.title}`,
          body: (c.body || "").trim() || "(No body text extracted for this clause.)",
          endBanner: undefined,
        },
      });
    });
  } else {
    pages.push({
      id: "scope",
      label: "1 Scope",
      kind: "scope",
      content: {
        heading: "1 Scope",
        body: input.scopeEn,
      },
    });
    if (input.fullText && input.fullText.trim().length > input.scopeEn.length + 40) {
      pages.push({
        id: "full-text",
        label: "Full text",
        kind: "body",
        content: {
          heading: "Full machine-pack text",
          body: input.fullText,
        },
      });
    }
  }

  return pages;
}

export async function getAdminFullStandardPreview(standardId: string) {
  const standard = await prisma.standard.findUnique({
    where: { id: standardId },
    include: {
      versions: {
        orderBy: { year: "desc" },
        include: {
          catalogItem: true,
          tariffMaps: { include: { tariffLine: { include: { rec: true } } } },
        },
      },
    },
  });
  if (!standard) return null;
  const sv = standard.versions[0];
  if (!sv) return null;

  let machine: MachineDoc = {};
  try {
    machine = JSON.parse(sv.machineDocJson) as MachineDoc;
  } catch {
    machine = {};
  }

  const designation = standard.designation;
  const scopeEn =
    (machine.scope && typeof machine.scope === "object" && "text" in machine.scope
      ? machine.scope.text?.en
      : undefined) || sv.scopeEn;

  const completeness = assessMachinePackCompleteness({
    scope: machine.scope ?? { text: { en: scopeEn } },
    normativeReferences: machine.normativeReferences,
    requirements: machine.requirements ?? (() => {
      try {
        return JSON.parse(sv.requirementsJson);
      } catch {
        return [];
      }
    })(),
    packaging: machine.packaging ?? (sv.packagingJson ? JSON.parse(sv.packagingJson) : null),
    labelling: machine.labelling ?? (sv.labellingJson ? JSON.parse(sv.labellingJson) : null),
    sampling: machine.sampling ?? (sv.samplingJson ? JSON.parse(sv.samplingJson) : null),
    contentHash: machine.contentHash ?? sv.contentHash,
  });

  const tocFallback = isArs464(designation, sv.editionLabel) ? ars464TableOfContents() : undefined;
  const toc: PreviewTocEntry[] = uniqueToc(
    tocFromMachineClauses(machine.clauses, tocFallback, machine.fullText),
  );

  let pdfPages: PdfPreviewPage[] = [];
  // Prefer clear full-page rasters from the source PDF whenever available
  if (sv.sourcePdfUri) {
    try {
      const rasters = await ensureStandardFullRasters({
        standardVersionId: sv.id,
        sourcePdfUri: sv.sourcePdfUri,
      });
      if (rasters) {
        pdfPages = pagesFromManifest(rasters.baseUrl, rasters.manifest).map((p) => ({
          ...p,
          access: "free" as const,
          note: "Full standard — authenticated admin preview",
        }));
      }
    } catch (e) {
      console.error("admin full preview raster failed", sv.id, e);
    }
  }
  // Prepared ARS 464 pack (no uploaded PDF): use clear full-page assets
  if (pdfPages.length === 0 && isArs464(designation, sv.editionLabel)) {
    pdfPages = buildArs464FullAdminPages();
  }

  const pages = buildFullTextPages({
    editionLabel: sv.editionLabel,
    titleEn: standard.titleEn,
    ics: standard.ics,
    publisher: standard.publisher,
    year: sv.year,
    technicalCommittee: machine.standard?.technicalCommittee ?? null,
    scopeEn,
    clauses: machine.clauses || [],
    fullText: machine.fullText,
  });

  return {
    mode: "full" as const,
    standardId: standard.id,
    catalogItemId: sv.catalogItem?.id ?? null,
    standardVersionId: sv.id,
    designation,
    editionLabel: sv.editionLabel,
    coverTitle: sv.catalogItem?.coverTitle || `${sv.editionLabel} ${standard.titleEn}`,
    titleOnly: standard.titleEn,
    scopeOnly: scopeEn,
    previewEndsAt: "Full standard (all clauses)",
    tableOfContents: toc,
    pages,
    pdfPages,
    pageCount: pdfPages.length || pages.length,
    freeThroughPage: pdfPages.length || pages.length,
    scopePage: 1,
    sourcePdfUri: sv.sourcePdfUri,
    fidelityNote: "Admin full preview — machine pack retained without omission; Clause 2+ unlocked.",
    completeness,
    tariffMaps: sv.tariffMaps.map((m) => ({
      id: m.id,
      tariffLineId: m.tariffLineId,
      codeDisplay: m.tariffLine.codeDisplay,
      description: m.tariffLine.description,
      rec: m.tariffLine.rec.code,
    })),
    machinePack: {
      clauseCount: machine.clauses?.length ?? 0,
      requirementCount: machine.requirements?.length ?? 0,
      normativeRefCount: machine.normativeReferences?.length ?? 0,
      fullTextChars: machine.fullText?.length ?? 0,
      contentHash: sv.contentHash,
      publicationStatus: sv.publicationStatus,
    },
  };
}

export type AdminFullStandardPreview = NonNullable<
  Awaited<ReturnType<typeof getAdminFullStandardPreview>>
>;
