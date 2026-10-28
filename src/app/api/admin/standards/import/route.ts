import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { convertUploadedStandard } from "@/lib/standard-import";
import { authoritativeLocaleOrNull } from "@/lib/publication";
import {
  ensureAuthoritativeLanguageFile,
  LANGUAGE_FILE_FIELDS,
  parseIdList,
  replaceStandardAdoptions,
  requireTechnicalCommittee,
  standardKindOrNull,
  storeStandardPdf,
  type LanguageCode,
} from "@/lib/standard-meta";

export const runtime = "nodejs";

/** Preview conversion without persisting (dry-run) or save when commit=1 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission("standards:import");
  if (auth.error) return auth.error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required (PDF or DOCX)" }, { status: 400 });
  }
  const commit = String(form.get("commit") || "") === "1" || String(form.get("commit") || "") === "true";
  const publishToStore = String(form.get("publishToStore") || "") === "1";
  const designationHint = form.get("designation") ? String(form.get("designation")) : undefined;
  const titleHint = form.get("title") ? String(form.get("title")) : undefined;
  const ics = String(form.get("ics") || "67.060").trim();
  // Multi-tariff: form may send tariffLineIds as repeated fields or JSON array string
  const rawTariffIds = form.getAll("tariffLineIds").flatMap((v) => {
    const s = String(v || "").trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        return (JSON.parse(s) as unknown[]).map(String);
      } catch {
        return [s];
      }
    }
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  });
  const tariffLineIds = [...new Set(rawTariffIds)];
  const kindRaw = String(form.get("kind") || "").trim();
  const kind = kindRaw ? standardKindOrNull(kindRaw) : "PRODUCT";
  const technicalCommitteeId = String(form.get("technicalCommitteeId") || "").trim();
  const memberStateIds = parseIdList(form.get("memberStateIds"));
  const authoritativeLocale = authoritativeLocaleOrNull(form.get("authoritativeLocale")) || "en";
  const languageUploads: Partial<Record<LanguageCode, File>> = {};
  for (const item of LANGUAGE_FILE_FIELDS) {
    const extra = form.get(item.field);
    if (extra instanceof File && extra.size > 0 && item.locale !== authoritativeLocale) {
      languageUploads[item.locale] = extra;
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > 40 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (40MB max)" }, { status: 413 });
  }

  let converted;
  try {
    converted = await convertUploadedStandard({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      designationHint,
      titleHint,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Conversion failed" },
      { status: 422 },
    );
  }

  const { pack, completeness } = converted;

  // Always persist the uploaded source for audit / re-processing
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "standards");
  await mkdir(uploadsDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${randomBytes(3).toString("hex")}-${safeName}`;
  const storedPath = path.join(uploadsDir, storedName);
  await writeFile(storedPath, buffer);
  const sourceUri = `/uploads/standards/${storedName}`;
  pack.version.sourcePdfUri = sourceUri;
  pack.standard.ics = ics.split(",").map((s) => s.trim()).filter(Boolean);
  pack.contentHash = `sha256:${createHash("sha256").update(JSON.stringify({ ...pack, contentHash: undefined })).digest("hex")}`;

  if (!commit) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      completeness,
      packPreview: {
        designation: pack.standard.designation,
        title: pack.standard.title.en,
        year: pack.version.year,
        editionLabel: pack.version.editionLabel,
        scopePreview: pack.scope.text.en.slice(0, 600),
        clauseCount: pack.clauses.length,
        requirementCount: pack.requirements.length,
        normativeRefCount: pack.normativeReferences.length,
        fullTextChars: pack.fullText.length,
        contentHash: pack.contentHash,
        fidelity: pack.fidelity,
        sourceUri,
      },
      checks: completeness.checks,
    });
  }

  // Persist — require write permission in addition to import
  const writeAuth = await requirePermission("standards:write");
  if (writeAuth.error) return writeAuth.error;
  if (!kind) {
    return NextResponse.json({ error: "Choose a standard kind from the list" }, { status: 400 });
  }
  try {
    await requireTechnicalCommittee(technicalCommitteeId);
    if (memberStateIds.length) {
      const found = await prisma.memberState.count({ where: { id: { in: memberStateIds } } });
      if (found !== memberStateIds.length) {
        throw new Error("Choose adopting countries from the African Union member states");
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Choose a technical committee" },
      { status: 400 },
    );
  }
  const storedLanguages: Partial<Record<LanguageCode, string>> = {};
  try {
    for (const item of LANGUAGE_FILE_FIELDS) {
      const extra = languageUploads[item.locale];
      if (!extra) continue;
      storedLanguages[item.locale] = await storeStandardPdf(extra);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not store a language PDF" },
      { status: 400 },
    );
  }

  const designation = pack.standard.designation;
  const existing = await prisma.standard.findUnique({ where: { designation } });
  if (existing) {
    return NextResponse.json(
      { error: `Standard ${designation} already exists — update via Standards CRUD or change designation` },
      { status: 409 },
    );
  }

  const stdId = `std-${designation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomBytes(2).toString("hex")}`;
  const verId = `sv-${randomBytes(4).toString("hex")}`;
  const { extractClause1ScopeOnly } = await import("@/lib/scope-text");
  const scopeEn = extractClause1ScopeOnly(pack.scope.text.en);
  pack.scope = { text: { en: scopeEn } };

  const standard = await prisma.standard.create({
    data: {
      id: stdId,
      designation,
      titleEn: pack.standard.title.en,
      ics: pack.standard.ics.join(",") || ics,
      publisher: pack.standard.publisher || "ARSO",
      kind,
      technicalCommitteeId,
      versions: {
        create: {
          id: verId,
          editionLabel: pack.version.editionLabel,
          year: pack.version.year,
          effectiveFrom: new Date(pack.version.effectiveFrom),
          publicationStatus: completeness.ok ? "PUBLISHED" : "DRAFT_IMPORT",
          authoritativeLocale,
          sourcePdfUri: sourceUri,
          contentHash: pack.contentHash,
          scopeEn,
          machineDocJson: JSON.stringify(pack),
          requirementsJson: JSON.stringify(pack.requirements),
          normativeRefsJson: JSON.stringify(pack.normativeReferences),
          packagingJson: pack.packaging ? JSON.stringify(pack.packaging) : null,
          labellingJson: pack.labelling ? JSON.stringify(pack.labelling) : null,
          samplingJson: pack.sampling ? JSON.stringify(pack.sampling) : null,
          catalogItem:
            publishToStore && Number(form.get("priceCents")) > 0
              ? {
                  create: {
                    priceCents: Math.round(Number(form.get("priceCents"))),
                    currency: "USD",
                    coverTitle: `${pack.version.editionLabel} ${pack.standard.title.en}`,
                    previewScopeOnly: true,
                    active: true,
                  },
                }
              : undefined,
        },
      },
    },
    include: { versions: { include: { catalogItem: true } } },
  });

  await ensureAuthoritativeLanguageFile(verId, authoritativeLocale, sourceUri);
  for (const [locale, uri] of Object.entries(storedLanguages)) {
    if (!uri) continue;
    await prisma.standardLanguageFile.upsert({
      where: { standardVersionId_locale: { standardVersionId: verId, locale } },
      create: { standardVersionId: verId, locale, sourcePdfUri: uri },
      update: { sourcePdfUri: uri },
    });
  }
  await replaceStandardAdoptions(standard.id, memberStateIds);

  for (const tariffLineId of tariffLineIds) {
    await prisma.standardTariffMap.create({
      data: {
        id: `map-${randomBytes(4).toString("hex")}`,
        standardVersionId: verId,
        tariffLineId,
        mappingEffect: "include",
        effectiveFrom: new Date(),
      },
    });
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "STANDARD_IMPORT",
    entityType: "Standard",
    entityId: standard.id,
    after: {
      designation,
      sourceUri,
      completeness,
      contentHash: pack.contentHash,
      omittedNormativeContent: false,
      tariffLineIds,
    },
  });

  return NextResponse.json({
    ok: true,
    dryRun: false,
    standard,
    completeness,
    fidelity: pack.fidelity,
    sourceUri,
    tariffLineIds,
  }, { status: 201 });
}
