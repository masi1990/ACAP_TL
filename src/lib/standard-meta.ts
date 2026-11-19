import { createHash, randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authoritativeLocaleOrNull } from "@/lib/publication";
import {
  LANGUAGE_FILE_FIELDS,
  parseIdList,
  type LanguageCode,
} from "@/lib/standard-kinds";

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

async function bufferFromUpload(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/** Reject “other language” uploads that are the same bytes as the authoritative PDF. */
export function duplicateLanguagePdfError(label: string, authoritativeLocale: string) {
  const auth =
    authoritativeLocale === "fr"
      ? "French"
      : authoritativeLocale === "pt"
        ? "Portuguese"
        : authoritativeLocale === "ar"
          ? "Arabic"
          : "English";
  return `${label} is identical to the authoritative ${auth} PDF. Upload a real ${label.replace(/ PDF$/i, "")} edition, or leave that field empty.`;
}

export {
  adoptionRate,
  LANGUAGE_FILE_FIELDS,
  parseIdList,
  PRODUCT_STANDARD_KIND,
  publishedLocales,
  STANDARD_KINDS,
  standardKindLabel,
  standardKindOrNull,
} from "@/lib/standard-kinds";
export type { LanguageCode } from "@/lib/standard-kinds";

const BOOL_FIELDS = new Set(["publishToStore"]);

export async function readStandardPayload(req: NextRequest): Promise<{
  body: Record<string, unknown>;
  files: Partial<Record<LanguageCode, File>>;
}> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { body, files: {} };
  }
  const form = await req.formData();
  const body: Record<string, unknown> = {};
  const files: Partial<Record<LanguageCode, File>> = {};
  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      const match = LANGUAGE_FILE_FIELDS.find((item) => item.field === key);
      if (match && value.size > 0) files[match.locale] = value;
      continue;
    }
    const text = String(value);
    if (key === "memberStateIds" || key === "tariffLineIds") {
      body[key] = parseIdList(text);
      continue;
    }
    if (BOOL_FIELDS.has(key)) {
      body[key] = text === "true" || text === "1" || text === "on";
      continue;
    }
    body[key] = text;
  }
  return { body, files };
}

export async function requireTechnicalCommittee(id: string) {
  const committeeId = String(id || "").trim();
  if (!committeeId) {
    throw new Error("Choose a technical committee. Create a sector and committee first.");
  }
  const row = await prisma.technicalCommittee.findUnique({ where: { id: committeeId } });
  if (!row) throw new Error("Choose a technical committee from the list");
  return row;
}

export async function replaceStandardAdoptions(standardId: string, memberStateIds: string[]) {
  const unique = [...new Set(memberStateIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length) {
    const found = await prisma.memberState.count({ where: { id: { in: unique } } });
    if (found !== unique.length) {
      throw new Error("Choose adopting countries from the African Union member states");
    }
  }
  await prisma.standardAdoption.deleteMany({ where: { standardId } });
  if (unique.length) {
    await prisma.standardAdoption.createMany({
      data: unique.map((memberStateId) => ({ standardId, memberStateId })),
    });
  }
}

export async function storeStandardPdf(file: File, preloaded?: Buffer): Promise<string> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Language editions must be PDF files");
  }
  const buf = preloaded ?? (await bufferFromUpload(file));
  if (buf.byteLength > 40 * 1024 * 1024) throw new Error("File too large (40MB max)");
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "standards");
  await mkdir(uploadsDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${randomBytes(3).toString("hex")}-${safeName}`;
  await writeFile(path.join(uploadsDir, storedName), buf);
  return `/uploads/standards/${storedName}`;
}

async function authoritativePdfHash(versionId: string, authLocale: string, files: Partial<Record<LanguageCode, File>>) {
  const authUpload = files[authLocale as LanguageCode];
  if (authUpload) return sha256(await bufferFromUpload(authUpload));
  const version = await prisma.standardVersion.findUnique({ where: { id: versionId } });
  const uri = version?.sourcePdfUri;
  if (!uri) return null;
  try {
    return sha256(await readFile(path.join(process.cwd(), "public", uri.replace(/^\//, ""))));
  } catch {
    return null;
  }
}

export async function attachLanguageFiles(
  versionId: string,
  files: Partial<Record<LanguageCode, File>>,
  authoritativeLocale: string,
) {
  const locale = authoritativeLocaleOrNull(authoritativeLocale) || "en";
  const authHash = await authoritativePdfHash(versionId, locale, files);
  const stored: Array<{ locale: LanguageCode; sourcePdfUri: string }> = [];
  for (const item of LANGUAGE_FILE_FIELDS) {
    const file = files[item.locale];
    if (!file) continue;
    const buf = await bufferFromUpload(file);
    if (item.locale !== locale && authHash && sha256(buf) === authHash) {
      throw new Error(duplicateLanguagePdfError(item.label, locale));
    }
    const sourcePdfUri = await storeStandardPdf(file, buf);
    await prisma.standardLanguageFile.upsert({
      where: { standardVersionId_locale: { standardVersionId: versionId, locale: item.locale } },
      create: { standardVersionId: versionId, locale: item.locale, sourcePdfUri },
      update: { sourcePdfUri },
    });
    stored.push({ locale: item.locale, sourcePdfUri });
    if (item.locale === locale) {
      await prisma.standardVersion.update({
        where: { id: versionId },
        data: { sourcePdfUri },
      });
    }
  }
  // Pre-build Clause 1 public rasters for each uploaded language (EN/FR/PT/AR).
  if (stored.length) {
    try {
      const { ensureStandardPreviewRasters } = await import("@/lib/preview-raster");
      for (const item of stored) {
        await ensureStandardPreviewRasters({
          standardVersionId: versionId,
          sourcePdfUri: item.sourcePdfUri,
          rasterKey: `${versionId}-${item.locale}`,
        });
      }
    } catch (err) {
      console.error("language preview raster prewarm failed", versionId, err);
    }
  }
}

export async function ensureAuthoritativeLanguageFile(
  versionId: string,
  locale: string,
  sourcePdfUri: string | null | undefined,
) {
  if (!sourcePdfUri) return;
  const language = authoritativeLocaleOrNull(locale) || "en";
  await prisma.standardLanguageFile.upsert({
    where: { standardVersionId_locale: { standardVersionId: versionId, locale: language } },
    create: { standardVersionId: versionId, locale: language, sourcePdfUri },
    update: { sourcePdfUri },
  });
}

