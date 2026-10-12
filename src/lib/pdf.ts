import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { writeFile, mkdir, readFile, copyFile, access } from "fs/promises";
import path from "path";
import { publicUriToFs } from "@/lib/preview-raster";

export async function generateLicencePdf(opts: {
  title: string;
  licenseNumber: string;
  holder: string;
  scheme: string;
  issuedAt: Date;
  expiresAt: Date;
  filename: string;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText("ARSO ACAP–TL", { x: 50, y: 780, size: 22, font: bold, color: rgb(0.05, 0.28, 0.22) });
  page.drawText(opts.title, { x: 50, y: 740, size: 16, font: bold });
  page.drawText(`Licence No: ${opts.licenseNumber}`, { x: 50, y: 700, size: 12, font });
  page.drawText(`Holder: ${opts.holder}`, { x: 50, y: 680, size: 12, font });
  page.drawText(`Scheme: ${opts.scheme}`, { x: 50, y: 660, size: 12, font });
  page.drawText(`Issued: ${opts.issuedAt.toISOString().slice(0, 10)}`, { x: 50, y: 640, size: 12, font });
  page.drawText(`Expires: ${opts.expiresAt.toISOString().slice(0, 10)}`, { x: 50, y: 620, size: 12, font });
  page.drawText("System-generated certificate — pilot build", {
    x: 50,
    y: 80,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  const bytes = await doc.save();
  const dir = path.join(process.cwd(), "public", "artifacts");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, opts.filename);
  await writeFile(filePath, bytes);
  return `/artifacts/${opts.filename}`;
}

function licenseMark(purchaser: string, orderId: string) {
  return `Licensed to ${purchaser} · Order ${orderId}`.replace(/[^\x20-\x7E]/g, " ");
}

async function fileExists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Stamp the license in the margin. Page content streams stay as uploaded. */
async function stampPdfMargin(bytes: Uint8Array, mark: string) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    page.drawText(mark, {
      x: 8,
      y: 28,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.45),
      rotate: degrees(90),
    });
  }
  return doc.save();
}

/**
 * Purchased file is the uploaded standard itself.
 * PDF pages are copied and only a margin license mark is added.
 * Other formats (for example .docx) are copied byte-for-byte.
 * A generated PDF is used only when no source file was stored, and it includes the full text.
 */
export async function generateWatermarkedStandardPdf(opts: {
  designation: string;
  title: string;
  scope: string;
  fullText?: string;
  sourcePdfUri?: string | null;
  purchaser: string;
  orderId: string;
  filename: string;
}) {
  const dir = path.join(process.cwd(), "public", "artifacts");
  await mkdir(dir, { recursive: true });
  const mark = licenseMark(opts.purchaser, opts.orderId);
  const sourceFs = opts.sourcePdfUri ? publicUriToFs(opts.sourcePdfUri) : null;

  if (sourceFs && (await fileExists(sourceFs))) {
    const ext = path.extname(sourceFs).toLowerCase() || ".pdf";
    const filename = opts.filename.endsWith(ext) ? opts.filename : `${opts.filename}${ext}`;
    const dest = path.join(dir, filename);
    const original = await readFile(sourceFs);
    if (ext === ".pdf") {
      try {
        const stamped = await stampPdfMargin(original, mark);
        await writeFile(dest, stamped);
        return `/artifacts/${filename}`;
      } catch (e) {
        console.error("pdf stamp failed; delivering the original file unchanged", e);
      }
    }
    await copyFile(sourceFs, dest);
    return `/artifacts/${filename}`;
  }

  const body = (opts.fullText?.trim() || opts.scope || "").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const paragraphs = body.split(/\n/);
  let page = doc.addPage([595, 842]);
  const drawMark = () => {
    page.drawText(mark, {
      x: 8,
      y: 28,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.45),
      rotate: degrees(90),
    });
  };
  drawMark();
  let y = 780;
  const writeLine = (text: string, size: number, useBold = false) => {
    const face = useBold ? bold : font;
    if (y < 48) {
      page = doc.addPage([595, 842]);
      drawMark();
      y = 780;
    }
    page.drawText(text, { x: 48, y, size, font: face });
    y -= size + 4;
  };
  writeLine(opts.designation, 16, true);
  writeLine(opts.title, 12, false);
  y -= 8;
  for (const paragraph of paragraphs) {
    const words = paragraph.length ? paragraph.split(/\s+/) : [""];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, 11) > 500) {
        if (line) writeLine(line, 11);
        line = word;
      } else {
        line = next;
      }
    }
    writeLine(line, 11);
    y -= 4;
  }

  const filename = opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`;
  await writeFile(path.join(dir, filename), await doc.save());
  return `/artifacts/${filename}`;
}

export async function generatePreviewPdf(opts: {
  designation: string;
  title: string;
  scope: string;
  filename: string;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText("PREVIEW — Cover + Scope only", {
    x: 50,
    y: 800,
    size: 11,
    font: bold,
    color: rgb(0.6, 0.2, 0.1),
  });
  page.drawText(opts.designation, { x: 50, y: 740, size: 22, font: bold });
  page.drawText(opts.title, { x: 50, y: 710, size: 12, font });
  page.drawText("1 Scope", { x: 50, y: 660, size: 14, font: bold });
  page.drawText(opts.scope.slice(0, 500), { x: 50, y: 630, size: 11, font, maxWidth: 480 });
  const bytes = await doc.save();
  const dir = path.join(process.cwd(), "public", "artifacts");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, opts.filename), bytes);
  return `/artifacts/${opts.filename}`;
}
