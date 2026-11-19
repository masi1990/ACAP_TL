import { execFile } from "child_process";
import { promisify } from "util";
import { access, readFile, mkdir } from "fs/promises";
import path from "path";
import { resolvePython } from "@/lib/python-bin";
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
  /** Public packs built with multilingual Clause 1 detection. */
  cutoff?: string;
  /** Localized Clause 1 label (EN/FR/PT/AR). */
  scopeLabel?: string;
  pages: ManifestPage[];
};

const PUBLIC_CUTOFF = "start-through-clause1";

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
  rasterKey?: string;
}): Promise<{ baseUrl: string; manifest: Manifest; editionText?: string } | null> {
  if (!opts.sourcePdfUri) return null;
  const pdfFs = publicUriToFs(opts.sourcePdfUri);
  if (!pdfFs || !(await exists(pdfFs))) return null;

  const folder = (opts.rasterKey || opts.standardVersionId).replace(/[^a-zA-Z0-9_-]/g, "");
  const outRel = path.join("uploads", "standards", "preview", folder);
  const outDir = path.join(process.cwd(), "public", outRel);
  const manifestPath = path.join(outDir, "manifest.json");

  const textPath = path.join(outDir, "preview-text.txt");
  let needsRebuild = !(await exists(manifestPath)) || !(await exists(textPath));
  if (!needsRebuild) {
    try {
      const existing = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
      if (existing.cutoff !== PUBLIC_CUTOFF) needsRebuild = true;
    } catch {
      needsRebuild = true;
    }
  }

  if (needsRebuild) {
    try {
      await mkdir(outDir, { recursive: true });
      const script = path.join(process.cwd(), "scripts", "generate-standard-preview.py");
      await execFileAsync(await resolvePython(), [script, pdfFs, outDir], {
        maxBuffer: 32 * 1024 * 1024,
        timeout: 90_000,
      });
    } catch (err) {
      console.error("public preview raster build failed", opts.standardVersionId, err);
      if (!(await exists(manifestPath))) return null;
    }
  }

  if (!(await exists(manifestPath))) return null;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  let editionText: string | undefined;
  if (await exists(textPath)) {
    try {
      editionText = await readFile(textPath, "utf8");
    } catch {
      editionText = undefined;
    }
  }
  return { baseUrl: `/${outRel.replace(/\\/g, "/")}`, manifest, editionText };
}

/**
 * Authenticated admin rasters — every PDF page clear and unlocked (no Clause-1 crop, no blur).
 * Stored separately from the public preview pack so store/lookup stay Clause-1-only.
 */
export async function ensureStandardFullRasters(opts: {
  standardVersionId: string;
  sourcePdfUri: string | null | undefined;
  rasterKey?: string;
}): Promise<{ baseUrl: string; manifest: Manifest } | null> {
  if (!opts.sourcePdfUri) return null;
  const pdfFs = publicUriToFs(opts.sourcePdfUri);
  if (!pdfFs || !(await exists(pdfFs))) return null;

  const folder = (opts.rasterKey || opts.standardVersionId).replace(/[^a-zA-Z0-9_-]/g, "");
  const outRel = path.join("uploads", "standards", "full", folder);
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
    try {
      await mkdir(outDir, { recursive: true });
      const script = path.join(process.cwd(), "scripts", "generate-standard-preview.py");
      await execFileAsync(await resolvePython(), [script, pdfFs, outDir, "--full"], {
        maxBuffer: 32 * 1024 * 1024,
        timeout: 90_000,
      });
    } catch (err) {
      // Never take down the Node process request path — fall back to machine-pack pages.
      console.error("full preview raster build failed", opts.standardVersionId, err);
      if (!(await exists(manifestPath))) return null;
    }
  }

  if (!(await exists(manifestPath))) return null;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  return { baseUrl: `/${outRel.replace(/\\/g, "/")}`, manifest };
}

/** Serve via /api/uploads so rasters created after `next start` are visible without restart. */
function publicUploadToApiUrl(uri: string) {
  if (uri.startsWith("/uploads/")) return `/api/uploads/${uri.slice("/uploads/".length)}`;
  if (uri.startsWith("uploads/")) return `/api/uploads/${uri.slice("uploads/".length)}`;
  return uri;
}

export function pagesFromManifest(baseUrl: string, manifest: Manifest): PdfPreviewPage[] {
  return manifest.pages
    .filter((p) => Boolean(p.image))
    .map((p, idx) => ({
      n: idx + 1,
      label: p.label,
      access: p.access === "partial" ? "free" : p.access,
      imageUrl: publicUploadToApiUrl(`${baseUrl}/${p.image}`),
      note: p.note,
    }));
}

/** Build TOC from full text headings — only clause 1 is free. */
export function tocFromFullText(fullText: string | undefined, fallback?: PreviewTocEntry[]): PreviewTocEntry[] {
  if (!fullText?.trim()) return fallback?.length ? fallback : defaultMinimalToc();
  const entries: PreviewTocEntry[] = [];
  const seen = new Set<string>();

  // TOC lines may put the clause number above the title: "1\nScope .... 4" or "1 Scope .... 4".
  // The page number stays on the title line so a later clause number is not treated as a page.
  const tocLine =
    /(?:^|\n)\s*(\d+(?:\.\d+)*)(?:[ \t]+|\s*\n\s*)(\p{L}[^\n.]{2,80}?)\s*(?:\.{2,}|\u2026|[ \t]{2,})[ \t]*\d+[ \t]*(?=\n|$)/gu;
  let m: RegExpExecArray | null;
  while ((m = tocLine.exec(fullText)) && entries.length < 24) {
    const number = m[1];
    const title = m[2].replace(/\s+/g, " ").trim();
    if (seen.has(number)) continue;
    if (!/^\p{L}/u.test(title)) continue;
    if (/^\d+(\s*[–-]\s*\d+)?$/.test(title)) continue;
    if (/^20\d{2}$/.test(number)) continue;
    if (Number(number) > 20 || Number(number) < 1) continue;
    if (/\bcfu\b/i.test(title) || /^absence\b/i.test(title) || /^\d/.test(title)) continue;
    if (/first edition/i.test(title)) continue;
    seen.add(number);
    entries.push({
      number,
      title,
      pageHint: "—",
      includedInPreview: number === "1" || number.startsWith("1."),
    });
  }

  // Fallback: stacked "1\nScope" / "1\nChamp d'application" headings when no dotted contents exist
  if (entries.length < 3) {
    const stacked = /(?:^|\n)\s*(\d+(?:\.\d+)*)[ \t]*\n[ \t]*(\p{L}[\p{L} /,&'’()-]{2,60})[ \t]*(?=\n|$)/gu;
    while ((m = stacked.exec(fullText)) && entries.length < 20) {
      const number = m[1];
      const title = m[2].trim();
      if (seen.has(number)) continue;
      if (!/^\p{L}/u.test(title)) continue;
      if (title.length > 60) continue;
      if (/^20\d{2}$/.test(number)) continue;
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
    !/^\p{L}/u.test(title) ||
    title.length < 4 ||
    /^[\d\s–—.\-]+$/.test(title) ||
    /\d+\s*[–—-]\s*\d+/.test(title) ||
    /\bcfu\b/i.test(title) ||
    /^absence\b/i.test(title) ||
    /^\d/.test(title);

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
    .filter(
      (e) =>
        /^\p{L}/u.test(e.title) &&
        e.title.length >= 4 &&
        e.title.length <= 80 &&
        !/\d+\s*[–—-]\s*\d+/.test(e.title) &&
        !/\bcfu\b/i.test(e.title) &&
        !/^absence\b/i.test(e.title) &&
        !/^\d/.test(e.title) &&
        !/^first edition\b/i.test(e.title) &&
        Number(e.number) >= 1 &&
        Number(e.number) <= 20,
    );
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
