import { execFile } from "child_process";
import { promisify } from "util";
import { access, readFile, mkdir } from "fs/promises";
import path from "path";
import type { PdfPreviewPage, PreviewTocEntry } from "@/lib/standard-preview-types";

const execFileAsync = promisify(execFile);

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

type ManifestPage = {
  n: number;
  label: string;
  access: "free" | "partial" | "locked";
  image: string;
  note?: string;
  scopeOnly?: boolean;
};

type Manifest = {
  pageCount: number;
  scopePage: number;
  mode?: "public" | "full";
  pages: ManifestPage[];
};

/** Resolve a public URI (/uploads/… or /standards/…) to a filesystem path. */
export function publicUriToFs(uri: string): string | null {
  if (!uri) return null;
  const clean = uri.split("?")[0];
  if (!clean.startsWith("/")) return null;
  return path.join(process.cwd(), "public", clean.replace(/^\//, ""));
}

export async function ensureStandardPreviewRasters(opts: {
  standardVersionId: string;
  sourcePdfUri: string | null | undefined;
}): Promise<{ baseUrl: string; manifest: Manifest } | null> {
  if (!opts.sourcePdfUri) return null;
  const pdfFs = publicUriToFs(opts.sourcePdfUri);
  if (!pdfFs || !(await exists(pdfFs))) return null;

  const outRel = path.join("uploads", "standards", "preview", opts.standardVersionId);
  const outDir = path.join(process.cwd(), "public", outRel);
  const manifestPath = path.join(outDir, "manifest.json");

  if (!(await exists(manifestPath))) {
    await mkdir(outDir, { recursive: true });
    const script = path.join(process.cwd(), "scripts", "generate-standard-preview.py");
    await execFileAsync("python3", [script, pdfFs, outDir], {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    });
  }

  if (!(await exists(manifestPath))) return null;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  return { baseUrl: `/${outRel.replace(/\\/g, "/")}`, manifest };
}

/**
 * Authenticated admin rasters — every PDF page clear and unlocked (no Clause-1 crop, no blur).
 * Stored separately from the public preview pack so store/lookup stay Clause-1-only.
 */
export async function ensureStandardFullRasters(opts: {
  standardVersionId: string;
  sourcePdfUri: string | null | undefined;
}): Promise<{ baseUrl: string; manifest: Manifest } | null> {
  if (!opts.sourcePdfUri) return null;
  const pdfFs = publicUriToFs(opts.sourcePdfUri);
  if (!pdfFs || !(await exists(pdfFs))) return null;

  const outRel = path.join("uploads", "standards", "full", opts.standardVersionId);
  const outDir = path.join(process.cwd(), "public", outRel);
  const manifestPath = path.join(outDir, "manifest.json");

  let needsRebuild = !(await exists(manifestPath));
  if (!needsRebuild) {
    try {
      const existing = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
      if (existing.mode !== "full") needsRebuild = true;
    } catch {
      needsRebuild = true;
    }
  }

  if (needsRebuild) {
    await mkdir(outDir, { recursive: true });
    const script = path.join(process.cwd(), "scripts", "generate-standard-preview.py");
    await execFileAsync("python3", [script, pdfFs, outDir, "--full"], {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    });
  }

  if (!(await exists(manifestPath))) return null;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  return { baseUrl: `/${outRel.replace(/\\/g, "/")}`, manifest };
}

export function pagesFromManifest(baseUrl: string, manifest: Manifest): PdfPreviewPage[] {
  return manifest.pages.map((p, idx) => ({
    n: idx + 1,
    label: p.label,
    access: p.access === "partial" ? "free" : p.access, // scope-only is free, never partial with clause 2
    imageUrl: `${baseUrl}/${p.image}`,
    note: p.note,
  }));
}

/** Build TOC from full text headings — only clause 1 is free. */
export function tocFromFullText(fullText: string | undefined, fallback?: PreviewTocEntry[]): PreviewTocEntry[] {
  if (!fullText?.trim()) return fallback?.length ? fallback : defaultMinimalToc();
  const entries: PreviewTocEntry[] = [];
  const seen = new Set<string>();

  // Prefer dotted TOC lines: "1 Scope .... 1" / "2 Normative references …"
  const tocLine =
    /(?:^|\n)\s*(\d+(?:\.\d+)*)\s+([A-Za-z][A-Za-z][^\n.]{2,70}?)\s*(?:\.{2,}|\u2026|\s{2,})\s*\d+/g;
  let m: RegExpExecArray | null;
  while ((m = tocLine.exec(fullText)) && entries.length < 24) {
    const number = m[1];
    const title = m[2].replace(/\s+/g, " ").trim();
    if (seen.has(number)) continue;
    if (!/^[A-Za-z]/.test(title)) continue;
    if (/^\d+(\s*[–-]\s*\d+)?$/.test(title)) continue;
    seen.add(number);
    entries.push({
      number,
      title,
      pageHint: "—",
      includedInPreview: number === "1" || number.startsWith("1."),
    });
  }

  // Fallback: stacked "1\nScope" headings with alphabetic titles only
  if (entries.length < 3) {
    const stacked = /(?:^|\n)\s*(\d+)\s*\n\s*([A-Za-z][A-Za-z /,&-]{2,60})/g;
    while ((m = stacked.exec(fullText)) && entries.length < 20) {
      const number = m[1];
      const title = m[2].trim();
      if (seen.has(number)) continue;
      if (!/^[A-Za-z]/.test(title)) continue;
      if (/\d/.test(title) && title.length < 8) continue;
      seen.add(number);
      entries.push({
        number,
        title,
        pageHint: "—",
        includedInPreview: number === "1",
      });
    }
  }

  const isJunkTitle = (title: string) =>
    !/^[A-Za-z]/.test(title) ||
    title.length < 4 ||
    /^[\d\s–—.\-]+$/.test(title) ||
    /\d+\s*[–—-]\s*\d+/.test(title);

  const clean = entries.filter((e) => !isJunkTitle(e.title));
  if (clean.length < 2) {
    return fallback?.length ? fallback : defaultMinimalToc();
  }

  if (!clean.some((e) => e.number === "1")) {
    clean.unshift({ number: "1", title: "Scope", pageHint: "—", includedInPreview: true });
  }
  // Ensure clause 1 is the only free preview entry
  return clean.map((e) => ({
    ...e,
    includedInPreview: e.number === "1",
    title: e.title.replace(/\s*\.+\s*$/, "").trim(),
  }));
}

export function tocFromMachineClauses(
  clauses: Array<{ number: string; title: string }> | undefined,
  fallback?: PreviewTocEntry[],
  fullText?: string,
): PreviewTocEntry[] {
  const fromText = tocFromFullText(fullText, fallback);
  if (!clauses?.length) return fromText;
  const top = clauses.filter((c) => /^\d+$/.test(String(c.number).trim()));
  const list = top
    .map((c) => ({
      number: String(c.number),
      title: c.title.replace(/^\d+(?:\.\d+)*\s*/, "").trim() || c.title,
      pageHint: "—",
      includedInPreview: String(c.number) === "1",
    }))
    .filter((e) => /^[A-Za-z]/.test(e.title) && e.title.length >= 4 && !/\d+\s*[–—-]\s*\d+/.test(e.title));
  if (list.length < 2) return fromText;
  // Prefer fullText TOC when clause titles look like prose fragments
  const junk = list.filter((e) => e.title.length > 60 || / of this | may contain /i.test(e.title)).length;
  return junk >= 2 ? fromText : list.map((e) => ({ ...e, includedInPreview: e.number === "1" }));
}

function defaultMinimalToc(): PreviewTocEntry[] {
  return [
    { number: "1", title: "Scope", pageHint: "—", includedInPreview: true },
    { number: "2", title: "Normative references", pageHint: "—", includedInPreview: false },
    { number: "3", title: "Terms and definitions", pageHint: "—", includedInPreview: false },
  ];
}
