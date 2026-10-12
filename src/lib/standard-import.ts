/**
 * PDF / Word → machine-readable conversion.
 * Standards may affect people, animals, and the environment — never omit
 * extracted normative text. Completeness gates publish readiness.
 */
import { createHash, randomBytes } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import os from "os";
import mammoth from "mammoth";
import {
  assessMachinePackCompleteness,
  CRITICAL_IMPACT_DOMAINS,
  FIDELITY_PRINCIPLES,
} from "@/lib/fidelity";
import { extractClause1ScopeOnly } from "@/lib/scope-text";

const execFileAsync = promisify(execFile);

export type ExtractedClause = {
  number: string;
  title: string;
  body: string;
};

export type MachinePack = {
  standard: {
    designation: string;
    title: { en: string };
    ics: string[];
    publisher: string;
    technicalCommittee?: string;
  };
  version: {
    year: number;
    editionLabel: string;
    effectiveFrom: string;
    publicationStatus: string;
    authoritativeLocale: string;
    sourcePdfUri: string | null;
  };
  scope: { text: { en: string } };
  normativeReferences: Array<{ designation: string; title?: string; raw: string }>;
  requirements: Array<{ id: string; clause: string; text: string }>;
  packaging: { text: string } | null;
  labelling: { text: string } | null;
  sampling: { text: string } | null;
  contaminants: { text: string } | null;
  hygiene: { text: string } | null;
  definitions: { text: string } | null;
  clauses: ExtractedClause[];
  fullText: string;
  contentHash: string;
  fidelity: {
    principles: readonly string[];
    criticalDomains: readonly string[];
    extractionMethod: string;
    omittedNormativeContent: false;
    humanReviewRequired: boolean;
  };
};

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Split document into numbered clauses (ISO/ARS style). Full text always retained. */
export function extractClauses(fullText: string): ExtractedClause[] {
  const text = normalizeWhitespace(fullText);
  const lines = text.split("\n");
  const clauseStart = /^(\d+(?:\.\d+)*)\s+([A-Z][^\n]{0,120})$/;
  const clauseStartInline = /^(\d+(?:\.\d+)*)\s+(.+)$/;

  const clauses: ExtractedClause[] = [];
  let current: ExtractedClause | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) current.body += "\n";
      continue;
    }
    const m = line.match(clauseStart) || line.match(clauseStartInline);
    const looksLikeHeading =
      m &&
      m[1] &&
      // avoid capturing table row numbers alone
      (m[2].length < 80 || /^[A-Z]/.test(m[2])) &&
      !/^\d+(\.\d+)*\s+\d/.test(line);

    if (looksLikeHeading && m) {
      if (current) clauses.push(current);
      current = { number: m[1], title: m[2].trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) clauses.push(current);
  return clauses;
}

function findClause(clauses: ExtractedClause[], ...needles: string[]) {
  const lower = needles.map((n) => n.toLowerCase());
  return (
    clauses.find((c) => lower.some((n) => c.title.toLowerCase().includes(n))) ||
    clauses.find((c) => lower.some((n) => `${c.number} ${c.title}`.toLowerCase().includes(n)))
  );
}

/** Fallback: pull a section from full text by heading keywords (no omission of matched body). */
function sliceByHeading(fullText: string, ...needles: string[]): string | null {
  const lowerNeedles = needles.map((n) => n.toLowerCase());
  const lines = fullText.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase();
    if (!l) continue;
    if (lowerNeedles.some((n) => l.includes(n)) && (l.length < 80 || /^\d/.test(l))) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const body: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (i > start && /^\d+(?:\.\d+)*\s+[A-Z]/.test(l.trim()) && body.join("\n").length > 40) break;
    body.push(l);
    if (body.join("\n").length > 12000) break;
  }
  const text = body.join("\n").trim();
  return text.length > 8 ? text : null;
}

function parseNormativeRefs(body: string) {
  const refs: Array<{ designation: string; title?: string; raw: string }> = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t || t.length < 4) continue;
    const des = t.match(/\b((?:ARS|ISO|IEC|EN|CODEX)[\s/.-]*[\w.-]+)/i);
    refs.push({
      designation: des?.[1]?.replace(/\s+/g, " ") || t.slice(0, 64),
      title: des ? t.replace(des[0], "").replace(/^[\s—–,:-]+/, "").trim() || undefined : undefined,
      raw: t,
    });
  }
  return refs;
}

export function buildMachinePackFromText(opts: {
  fullText: string;
  fileName: string;
  extractionMethod: string;
  designationHint?: string;
  titleHint?: string;
  yearHint?: number;
}): { pack: MachinePack; completeness: ReturnType<typeof assessMachinePackCompleteness> } {
  const fullText = normalizeWhitespace(opts.fullText);
  if (!fullText) {
    throw new Error("Document contained no extractable text");
  }

  const clauses = extractClauses(fullText);
  const scopeClause = findClause(clauses, "scope");
  const normativeClause = findClause(clauses, "normative reference");
  const definitionsClause = findClause(clauses, "definition", "term and definition");
  const packagingClause = findClause(clauses, "packaging");
  const labellingClause = findClause(clauses, "labelling", "labeling");
  const samplingClause = findClause(clauses, "sampling");
  const contaminantsClause = findClause(clauses, "contaminant");
  const hygieneClause = findClause(clauses, "hygiene");

  // Public scope field must be Clause 1 only — never pull clause 2+ into scopeEn.
  const scopeRaw =
    (scopeClause ? `${scopeClause.title}\n${scopeClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "1 scope", "scope") ||
    fullText.slice(0, 2000);
  const scopeText = extractClause1ScopeOnly(scopeRaw || fullText);
  const normativeText =
    (normativeClause ? `${normativeClause.title}\n${normativeClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "normative reference");
  const packagingText =
    (packagingClause ? `${packagingClause.title}\n${packagingClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "packaging");
  const labellingText =
    (labellingClause ? `${labellingClause.title}\n${labellingClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "labelling", "labeling");
  const samplingText =
    (samplingClause ? `${samplingClause.title}\n${samplingClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "sampling");
  const contaminantsText =
    (contaminantsClause ? `${contaminantsClause.title}\n${contaminantsClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "contaminant");
  const hygieneText =
    (hygieneClause ? `${hygieneClause.title}\n${hygieneClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "hygiene");
  const definitionsText =
    (definitionsClause ? `${definitionsClause.title}\n${definitionsClause.body}`.trim() : null) ||
    sliceByHeading(fullText, "definition");

  const designationMatch =
    fullText.match(/\b(ARS\s*\d+(?:\s*:\s*\d{4})?)\b/i) ||
    opts.fileName.match(/\b(ARS[-\s]*\d+)/i);
  const designation =
    opts.designationHint ||
    (designationMatch ? designationMatch[1].replace(/\s+/g, " ").toUpperCase() : `IMPORT-${randomBytes(3).toString("hex").toUpperCase()}`);

  const yearMatch = designation.match(/(\d{4})/) || fullText.match(/\b(20\d{2})\b/);
  const year = opts.yearHint || (yearMatch ? Number(yearMatch[1]) : new Date().getFullYear());

  const titleFromCover =
    opts.titleHint ||
    fullText
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 12 && /specification|standard|code of practice|guideline/i.test(l)) ||
    opts.fileName.replace(/\.(pdf|docx?)$/i, "").replace(/[-_]/g, " ");

  const requirements: MachinePack["requirements"] = [];
  for (const c of clauses) {
    if (/requirement|grading|classification|quality|contaminant|hygiene|packaging|labelling|labeling|sampling/i.test(c.title)) {
      requirements.push({
        id: `CL-${c.number}`,
        clause: c.number,
        text: `${c.title}\n${c.body}`.trim(),
      });
    }
  }
  // If no structured requirements found, retain entire post-scope body as one requirement block (no omission).
  if (requirements.length === 0) {
    requirements.push({
      id: "FULL-BODY",
      clause: "body",
      text: fullText,
    });
  }

  const packWithoutHash: Omit<MachinePack, "contentHash"> = {
    standard: {
      designation: designation.replace(/\s+/g, " "),
      title: { en: titleFromCover },
      ics: [],
      publisher: "ARSO",
    },
    version: {
      year,
      editionLabel: designation.includes(":") ? designation.replace(/\s+/g, " ") : `${designation.replace(/\s+/g, " ")}:${year}`,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      publicationStatus: "DRAFT_IMPORT",
      authoritativeLocale: "en",
      sourcePdfUri: null,
    },
    scope: {
      text: {
        en: scopeText,
      },
    },
    normativeReferences: (() => {
      if (!normativeText) return [];
      const refs = parseNormativeRefs(normativeText);
      if (refs.length > 0) return refs;
      return [{ designation: "see-source", raw: normativeText }];
    })(),
    requirements,
    packaging: packagingText ? { text: packagingText } : null,
    labelling: labellingText ? { text: labellingText } : null,
    sampling: samplingText ? { text: samplingText } : null,
    contaminants: contaminantsText ? { text: contaminantsText } : null,
    hygiene: hygieneText ? { text: hygieneText } : null,
    definitions: definitionsText ? { text: definitionsText } : null,
    clauses,
    fullText,
    fidelity: {
      principles: FIDELITY_PRINCIPLES,
      criticalDomains: CRITICAL_IMPACT_DOMAINS,
      extractionMethod: opts.extractionMethod,
      omittedNormativeContent: false,
      humanReviewRequired: true,
    },
  };

  const contentHash = `sha256:${createHash("sha256").update(JSON.stringify(packWithoutHash)).digest("hex")}`;
  const pack: MachinePack = { ...packWithoutHash, contentHash };

  const completeness = assessMachinePackCompleteness({
    scope: pack.scope,
    normativeReferences: pack.normativeReferences,
    requirements: pack.requirements,
    packaging: pack.packaging,
    labelling: pack.labelling,
    sampling: pack.sampling,
    contentHash: pack.contentHash,
  });

  return { pack, completeness };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), `acap-import-${randomBytes(4).toString("hex")}`);
  await mkdir(tmpDir, { recursive: true });
  const pdfPath = path.join(tmpDir, "source.pdf");
  const outPath = path.join(tmpDir, "out.txt");
  await writeFile(pdfPath, buffer);

  const script = `
import sys
try:
    import pymupdf as fitz
except ImportError:
    import fitz
doc = fitz.open(sys.argv[1])
parts = []
for i, page in enumerate(doc):
    parts.append(page.get_text("text"))
open(sys.argv[2], "w", encoding="utf-8").write("\\n".join(parts))
print(len(doc))
`;
  const pyPath = path.join(tmpDir, "extract.py");
  await writeFile(pyPath, script);
  try {
    await execFileAsync("python3", [pyPath, pdfPath, outPath], { maxBuffer: 20 * 1024 * 1024 });
    const { readFile } = await import("fs/promises");
    return await readFile(outPath, "utf8");
  } catch (e) {
    const stderr =
      e && typeof e === "object" && "stderr" in e ? String((e as { stderr?: unknown }).stderr ?? "") : "";
    const detail = stderr || (e instanceof Error ? e.message : "PDF text extraction failed");
    if (detail.includes("No module named")) {
      throw new Error(
        "PDF import needs PyMuPDF for python3. Install it with: python3 -m pip install --user 'pymupdf==1.24.14'",
      );
    }
    throw new Error(detail.trim().split("\n").slice(-6).join("\n"));
  } finally {
    for (const f of [pdfPath, outPath, pyPath]) {
      await unlink(f).catch(() => undefined);
    }
  }
}

async function extractWordText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

export async function extractDocumentText(file: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<{ text: string; method: string }> {
  const name = file.fileName.toLowerCase();
  const mime = (file.mimeType || "").toLowerCase();
  if (name.endsWith(".pdf") || mime.includes("pdf")) {
    const text = await extractPdfText(file.buffer);
    return { text, method: "pymupdf-text" };
  }
  if (name.endsWith(".docx") || mime.includes("wordprocessingml") || mime.includes("officedocument")) {
    const text = await extractWordText(file.buffer);
    return { text, method: "mammoth-docx" };
  }
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc is not supported — save as .docx or PDF");
  }
  throw new Error("Unsupported file type — upload PDF or Word (.docx)");
}

export async function convertUploadedStandard(file: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
  designationHint?: string;
  titleHint?: string;
}) {
  const { text, method } = await extractDocumentText(file);
  return buildMachinePackFromText({
    fullText: text,
    fileName: file.fileName,
    extractionMethod: method,
    designationHint: file.designationHint,
    titleHint: file.titleHint,
  });
}
