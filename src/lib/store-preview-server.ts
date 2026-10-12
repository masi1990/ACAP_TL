import { prisma } from "@/lib/db";
import { buildStandardPreviewPayload } from "@/lib/standard-preview";
import { assessMachinePackCompleteness } from "@/lib/fidelity";
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import {
  ensureStandardPreviewRasters,
  pagesFromManifest,
  tocFromMachineClauses,
} from "@/lib/preview-raster";
import { ars464TableOfContents } from "@/lib/standard-preview";

type MachineDoc = {
  standard?: { technicalCommittee?: string; designation?: string };
  scope?: { text?: { en?: string } } | unknown;
  normativeReferences?: unknown[];
  requirements?: unknown[];
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

export async function getCatalogPreviewPayload(catalogItemId: string) {
  const item = await prisma.catalogItem.findUnique({
    where: { id: catalogItemId },
    include: { standardVersion: { include: { standard: true } } },
  });
  if (!item) return null;

  const sv = item.standardVersion;
  const designation = sv.standard.designation;
  let machine: MachineDoc = {};
  try {
    machine = JSON.parse(sv.machineDocJson) as MachineDoc;
  } catch {
    machine = {};
  }

  const scopeEn = extractClause1ScopeOnly(sv.scopeEn);
  const technicalCommittee = machine.standard?.technicalCommittee ?? null;

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

  const toc = tocFromMachineClauses(
    machine.clauses,
    isArs464(designation, sv.editionLabel) ? ars464TableOfContents() : undefined,
    machine.fullText,
  );

  // Per-standard document pages — never reuse another standard's rasters
  let pdfPages = undefined as ReturnType<typeof pagesFromManifest> | undefined;
  if (isArs464(designation, sv.editionLabel) && !sv.sourcePdfUri?.includes("/uploads/")) {
    // prepared ARS 464 assets only when this IS ARS 464
    pdfPages = undefined; // buildStandardPreviewPayload will use ARS464 pack
  } else if (sv.sourcePdfUri) {
    try {
      const rasters = await ensureStandardPreviewRasters({
        standardVersionId: sv.id,
        sourcePdfUri: sv.sourcePdfUri,
      });
      if (rasters) {
        pdfPages = pagesFromManifest(rasters.baseUrl, rasters.manifest);
      }
    } catch (e) {
      console.error("preview raster failed", sv.id, e);
    }
  }

  const preview = buildStandardPreviewPayload({
    editionLabel: sv.editionLabel,
    coverTitle: item.coverTitle,
    scopeEn,
    ics: sv.standard.ics,
    publisher: sv.standard.publisher,
    year: sv.year,
    technicalCommittee,
    sourcePdfUri: sv.sourcePdfUri,
    designation,
    tableOfContents: toc,
    pdfPages,
  });

  return {
    catalogItemId: item.id,
    standardVersionId: sv.id,
    completeness,
    ...preview,
  };
}

export async function getStandardPreviewByVersionId(standardVersionId: string) {
  const catalog = await prisma.catalogItem.findFirst({
    where: { standardVersionId },
  });
  if (catalog) return getCatalogPreviewPayload(catalog.id);

  const sv = await prisma.standardVersion.findUnique({
    where: { id: standardVersionId },
    include: { standard: true },
  });
  if (!sv) return null;

  let machine: MachineDoc = {};
  try {
    machine = JSON.parse(sv.machineDocJson) as MachineDoc;
  } catch {
    machine = {};
  }

  const scopeEn = extractClause1ScopeOnly(sv.scopeEn);
  const toc = tocFromMachineClauses(machine.clauses, undefined, machine.fullText);
  let pdfPages = undefined as ReturnType<typeof pagesFromManifest> | undefined;
  if (sv.sourcePdfUri) {
    try {
      const rasters = await ensureStandardPreviewRasters({
        standardVersionId: sv.id,
        sourcePdfUri: sv.sourcePdfUri,
      });
      if (rasters) pdfPages = pagesFromManifest(rasters.baseUrl, rasters.manifest);
    } catch {
      /* fall through to text pages */
    }
  }

  const preview = buildStandardPreviewPayload({
    editionLabel: sv.editionLabel,
    coverTitle: `${sv.editionLabel} ${sv.standard.titleEn}`,
    scopeEn,
    ics: sv.standard.ics,
    publisher: sv.standard.publisher,
    year: sv.year,
    sourcePdfUri: sv.sourcePdfUri,
    designation: sv.standard.designation,
    tableOfContents: toc,
    pdfPages,
  });
  return {
    catalogItemId: null as string | null,
    standardVersionId: sv.id,
    completeness: null,
    ...preview,
  };
}

export type CatalogPreviewPayload = NonNullable<
  Awaited<ReturnType<typeof getCatalogPreviewPayload>>
>;
