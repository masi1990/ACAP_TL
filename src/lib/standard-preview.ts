/**
 * Public free preview of an African Standard.
 * Strict rule: only Clause 1 Scope is readable. Clause 2+ is locked/blurred
 * and must never appear in free preview content (including shared body pages).
 */
import { extractClause1ScopeOnly } from "@/lib/scope-text";
import type { PdfPreviewPage, PreviewPage, PreviewTocEntry } from "@/lib/standard-preview-types";

export type { PdfPreviewPage, PreviewPage, PreviewTocEntry } from "@/lib/standard-preview-types";

/** TOC from ARS 464:2022 PDF (page ii) — used only for that designation */
export function ars464TableOfContents(): PreviewTocEntry[] {
  return [
    { number: "1", title: "Scope", pageHint: "1", includedInPreview: true },
    { number: "2", title: "Normative references", pageHint: "1", includedInPreview: false },
    { number: "3", title: "Definitions", pageHint: "2", includedInPreview: false },
    { number: "4", title: "Quality requirements", pageHint: "6", includedInPreview: false },
    { number: "4.2", title: "General requirements", pageHint: "6", includedInPreview: false },
    { number: "4.3", title: "Specific requirements", pageHint: "6", includedInPreview: false },
    { number: "4.3.1", title: "Classification", pageHint: "6", includedInPreview: false },
    { number: "4.3.2", title: "Grading", pageHint: "7", includedInPreview: false },
    { number: "5", title: "Contaminants", pageHint: "7", includedInPreview: false },
    { number: "5.1", title: "Metals", pageHint: "7", includedInPreview: false },
    { number: "5.2", title: "Pesticide residues", pageHint: "8", includedInPreview: false },
    { number: "6", title: "Hygiene", pageHint: "8", includedInPreview: false },
    { number: "7", title: "Packaging", pageHint: "8", includedInPreview: false },
    { number: "8", title: "Labelling", pageHint: "8", includedInPreview: false },
    { number: "9", title: "Sampling", pageHint: "9", includedInPreview: false },
    { number: "—", title: "Bibliography", pageHint: "10", includedInPreview: false },
  ];
}

export type BuiltStandardPreview = ReturnType<typeof buildStandardPreviewPayload>;

/** ARS 464 prepared assets: front matter free; Scope-only free; Clause 2+ locked. */
export function buildArs464PdfPages(basePath = "/standards/ars-464-2022/pages/preview"): PdfPreviewPage[] {
  const front: PdfPreviewPage[] = [
    { n: 1, label: "Cover", access: "free", imageUrl: `${basePath}/page-01.png` },
    { n: 2, label: "Table of contents", access: "free", imageUrl: `${basePath}/page-02.png` },
    { n: 3, label: "Foreword", access: "free", imageUrl: `${basePath}/page-03.png` },
    { n: 4, label: "Copyright notice", access: "free", imageUrl: `${basePath}/page-04.png` },
    { n: 5, label: "Introduction", access: "free", imageUrl: `${basePath}/page-05.png` },
    { n: 6, label: "Blank separator", access: "free", imageUrl: `${basePath}/page-06.png` },
    {
      n: 7,
      label: "1 Scope (Clause 1 only)",
      access: "free",
      imageUrl: `${basePath}/page-07-scope-only.png`,
    },
  ];
  const locked: PdfPreviewPage[] = [];
  for (let n = 8; n <= 17; n++) {
    locked.push({
      n,
      label: n === 8 ? "Body — Clause 2+ (locked)" : `Page ${n} (locked)`,
      access: "locked",
      imageUrl: `${basePath}/page-${String(n).padStart(2, "0")}.png`,
      note: "Locked — Clause 2 and later are not shown in the free preview.",
    });
  }
  // renumber sequentially for UI
  return [...front, ...locked].map((p, i) => ({ ...p, n: i + 1 }));
}

function isArs464(designation: string, editionLabel: string) {
  const hay = `${designation} ${editionLabel}`.toUpperCase();
  return /\bARS\s*464\b/.test(hay);
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
  /** When set, TOC is taken from this standard's machine pack — never another standard's TOC */
  tableOfContents?: PreviewTocEntry[];
  /** When set, document pages are for THIS standard only */
  pdfPages?: PdfPreviewPage[];
}) {
  const scopeOnly = extractClause1ScopeOnly(input.scopeEn);
  const designation = input.designation || input.editionLabel;
  const useArs464Assets = isArs464(designation, input.editionLabel) && !input.pdfPages;

  const toc =
    input.tableOfContents && input.tableOfContents.length > 0
      ? input.tableOfContents.map((e) => ({
          ...e,
          includedInPreview: e.number === "1" || e.number === "1.0",
        }))
      : useArs464Assets
        ? ars464TableOfContents()
        : [
            { number: "1", title: "Scope", pageHint: "—", includedInPreview: true },
            { number: "2", title: "Normative references", pageHint: "—", includedInPreview: false },
          ];

  const titleOnly =
    input.coverTitle
      .replace(new RegExp(`^${designation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]?\\s*`, "i"), "")
      .trim() || input.coverTitle;

  const pdfPages =
    input.pdfPages && input.pdfPages.length > 0
      ? input.pdfPages
      : useArs464Assets
        ? buildArs464PdfPages()
        : [];

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
        note: `As published in ${input.editionLabel} — free preview ends after Clause 1 Scope.`,
      },
    },
    {
      id: "scope",
      label: "1 Scope",
      kind: "scope",
      content: {
        heading: "1 Scope",
        body: scopeOnly,
        endBanner: "— End of free readable content (Clause 1 Scope only) —",
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
    previewEndsAt: "Clause 1 — Scope only",
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
