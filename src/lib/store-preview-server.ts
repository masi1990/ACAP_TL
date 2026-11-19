import { prisma } from "@/lib/db";
import { buildStandardPreviewPayload } from "@/lib/standard-preview";
import { assessMachinePackCompleteness } from "@/lib/fidelity";
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import { openReading } from "@/lib/catalog-access";
import {
  ensureStandardFullRasters,
  ensureStandardPreviewRasters,
  pagesFromManifest,
  tocFromMachineClauses,
} from "@/lib/preview-raster";
import { authoritativeLocaleOrNull } from "@/lib/publication";

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

/**
 * Public/catalog preview for any published standard.
 * Uses that standard's own PDF + machine pack — no designation-specific assets.
 */
export async function getCatalogPreviewPayload(catalogItemId: string, editionLocale?: string | null) {
  const item = await prisma.catalogItem.findUnique({
    where: { id: catalogItemId },
    include: {
      standardVersion: {
        include: {
          languageFiles: true,
          standard: { include: { technicalCommittee: { include: { sector: true } }, adoptions: true } },
        },
      },
    },
  });
  if (!item) return null;

  const sv = item.standardVersion;
  const requested = authoritativeLocaleOrNull(editionLocale);
  const languageFile = requested
    ? sv.languageFiles.find((file) => file.locale === requested)
    : sv.languageFiles.find((file) => file.locale === sv.authoritativeLocale);
  if (requested && !languageFile && !(requested === sv.authoritativeLocale && sv.sourcePdfUri)) return null;
  const previewLocale = languageFile?.locale || sv.authoritativeLocale;
  const sourcePdfUri = languageFile?.sourcePdfUri || sv.sourcePdfUri;
  const designation = sv.standard.designation;
  let machine: MachineDoc = {};
  try {
    machine = JSON.parse(sv.machineDocJson) as MachineDoc;
  } catch {
    machine = {};
  }

  let scopeEn = extractClause1ScopeOnly(sv.scopeEn);
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

  let toc = tocFromMachineClauses(machine.clauses, undefined, machine.fullText);

  const readable = openReading(item.distribution);
  // Per-standard rasters from that version's PDF (keyed by version+locale)
  let pdfPages = undefined as ReturnType<typeof pagesFromManifest> | undefined;
  if (sourcePdfUri) {
    try {
      if (readable) {
        const rasters = await ensureStandardFullRasters({
          standardVersionId: sv.id,
          sourcePdfUri,
          rasterKey: `${sv.id}-${previewLocale}`,
        });
        if (rasters) {
          pdfPages = pagesFromManifest(rasters.baseUrl, rasters.manifest).map((page) => ({
            ...page,
            access: "free" as const,
            note: undefined,
          }));
        }
      } else {
        const rasters = await ensureStandardPreviewRasters({
          standardVersionId: sv.id,
          sourcePdfUri,
          rasterKey: `${sv.id}-${previewLocale}`,
        });
        if (rasters) {
          pdfPages = pagesFromManifest(rasters.baseUrl, rasters.manifest);
          // Prefer the selected language PDF text for Clause 1 + TOC (FR/PT/AR editions).
          if (rasters.editionText?.trim()) {
            const fromEdition = extractClause1ScopeOnly(rasters.editionText);
            if (fromEdition.trim()) scopeEn = fromEdition;
            toc = tocFromMachineClauses(undefined, toc, rasters.editionText);
          }
        }
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
    sourcePdfUri,
    designation,
    editionLocale: previewLocale,
    tableOfContents: toc,
    pdfPages,
  });

  return {
    ...preview,
    catalogItemId: item.id,
    standardVersionId: sv.id,
    editionLocale: previewLocale,
    completeness,
    distribution: item.distribution,
    openReading: readable,
    allowDownload: item.distribution === "FREE_DOWNLOAD",
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
    ...preview,
    catalogItemId: null as string | null,
    standardVersionId: sv.id,
    completeness: null,
    distribution: "PAID",
    openReading: false,
    allowDownload: false,
  };
}

export type CatalogPreviewPayload = NonNullable<
  Awaited<ReturnType<typeof getCatalogPreviewPayload>>
>;
