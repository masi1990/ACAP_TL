/**
 * Public free preview of an African Standard.
 * Generic for every designation: starting pages through Clause 1 Scope.
 * PDF page images come from that standard's own uploaded file (see preview-raster).
 */
import { clause1Labels } from "@/lib/preview-locale";
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import type { PdfPreviewPage, PreviewPage, PreviewTocEntry } from "@/lib/standard-preview-types";

export type { PdfPreviewPage, PreviewPage, PreviewTocEntry } from "@/lib/standard-preview-types";

export type BuiltStandardPreview = ReturnType<typeof buildStandardPreviewPayload>;

function defaultPublicToc(scopeTitle: string): PreviewTocEntry[] {
  return [{ number: "1", title: scopeTitle, pageHint: "—", includedInPreview: true }];
}

export function buildStandardPreviewPayload(input: {
  editionLabel: string;
  coverTitle: string;
  scopeEn: string;
  ics: string;
  publisher: string;
  year: number;
  technicalCommittee?: string | null;
  sourcePdfUri?: string | null;
  designation?: string;
  /** Uploaded language edition (en|fr|pt|ar) */
  editionLocale?: string | null;
  /** TOC from this standard's machine pack / extracted text */
  tableOfContents?: PreviewTocEntry[];
  /** Raster pages for THIS standard only (from its PDF) */
  pdfPages?: PdfPreviewPage[];
}) {
  const labels = clause1Labels(input.editionLocale);
  const scopeOnly = extractClause1ScopeOnly(input.scopeEn);
  const designation = input.designation || input.editionLabel;

  const toc =
    input.tableOfContents && input.tableOfContents.length > 0
      ? input.tableOfContents.map((e) => ({
          ...e,
          includedInPreview: e.number === "1" || e.number === "1.0" || e.number.startsWith("1."),
        }))
      : defaultPublicToc(labels.title);

  const titleOnly =
    input.coverTitle
      .replace(new RegExp(`^${designation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]?\\s*`, "i"), "")
      .trim() || input.coverTitle;

  // Never substitute another standard's prepared page pack.
  const pdfPages = input.pdfPages && input.pdfPages.length > 0 ? input.pdfPages : [];

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
        title: titleOnly,
        ics: input.ics,
        publisher: input.publisher,
        year: String(input.year),
        committee: input.technicalCommittee || "",
      },
    },
    {
      id: "toc",
      label: "Contents",
      kind: "toc",
      content: {
        heading: "Table of contents",
        note: `As published in ${input.editionLabel} — free preview ends after ${labels.numberTitle}.`,
      },
    },
    {
      id: "scope",
      label: labels.numberTitle,
      kind: "scope",
      content: {
        heading: labels.numberTitle,
        body: scopeOnly,
        endBanner: labels.endBanner,
      },
    },
  ];

  const freeCount = pdfPages.filter((p) => p.access === "free").length || 1;

  return {
    editionLabel: input.editionLabel,
    coverTitle: input.coverTitle,
    titleOnly,
    designation,
    scopeOnly,
    previewEndsAt: labels.previewEndsAt,
    tableOfContents: toc,
    pages,
    pdfPages,
    pageCount: pdfPages.length || pages.length,
    freeThroughPage: freeCount,
    scopePage: freeCount,
    sourcePdfUri: input.sourcePdfUri ?? null,
    fidelityNote:
      "Public preview is Clause 1 Scope only. The machine pack retains the full normative text without omission.",
  };
}
