/**
 * One testing dossier per certification application.
 * The certificate reads these rows; it does not keep a second copy.
 */

export const DOSSIER_ANNEXES = [
  { code: "LICENCE_APPLICATION", title: "Application for licence to use the mark of conformity" },
  { code: "INITIAL_INSPECTION", title: "Checklist for the initial inspection report" },
  { code: "LAB_TEST_REPORT", title: "Checklist for the laboratory test report" },
  { code: "FACTORY_QUESTIONNAIRE", title: "Questionnaire for the initial factory assessment" },
  { code: "SPECIFIC_RULES", title: "Checklist for the basic content of specific rules" },
  { code: "SAMPLING_REPORT", title: "Checklist for the sampling report" },
  { code: "LICENCE", title: "Licence" },
  { code: "SURVEILLANCE", title: "Checklist for the surveillance inspection report" },
] as const;

export type AnnexCode = (typeof DOSSIER_ANNEXES)[number]["code"];

/** Optional scan of the certification body's own certificate. One file per application. */
export const INTERNAL_CERTIFICATE_KIND = "INTERNAL_CERT";

export const ANNEX_SOURCES =
  "ISO/ITC, Certification — Principles and practice, 1980. ISO Development manual 2 — Operation of a certification system, 1982. ISO/IEC Guide 28, General rules for a model third-party certification system for products, 1982.";

export function annexTitle(code: string) {
  return DOSSIER_ANNEXES.find((annex) => annex.code === code)?.title ?? code;
}

export function isAnnexCode(code: string): code is AnnexCode {
  return DOSSIER_ANNEXES.some((annex) => annex.code === code);
}

export type GapDossier = {
  laboratoryName: string;
  reportNo: string;
  sampleCode: string;
  testedAt: Date | string | null;
} | null;

export type GapItem = {
  source: string;
  kind: string;
  pass: boolean | null;
  measuredValue: string;
  evidenceCount: number;
};

/** What is still missing before a certificate can be issued. Annexes are optional. */
export function dossierGaps(dossier: GapDossier, items: GapItem[]): string[] {
  const gaps: string[] = [];
  if (!dossier?.laboratoryName.trim()) gaps.push("Laboratory name");
  if (!dossier?.reportNo.trim()) gaps.push("Test report number");
  if (!dossier?.sampleCode.trim()) gaps.push("Sample code");
  if (!dossier?.testedAt) gaps.push("Date tested");
  if (items.length === 0) {
    gaps.push("Requirements from the standard");
    return gaps;
  }
  if (items.some((item) => item.pass !== true)) gaps.push("A pass on every requirement");
  const tables = items.filter((item) => item.source === "STANDARD" && item.kind === "table");
  if (tables.some((item) => !item.measuredValue.trim())) {
    gaps.push("A measured value on every test in the standard tables");
  }
  if (tables.some((item) => item.evidenceCount === 0)) {
    gaps.push("A laboratory file on every test in the standard tables");
  }
  return gaps;
}
