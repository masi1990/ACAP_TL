/**
 * One-shot: publish ARS 1184 with real EN + FR PDFs so store language tabs
 * exercise Clause 1 public preview. PT/AR need official PDFs via admin upload.
 */
import { createHash, randomBytes } from "crypto";
import { copyFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { convertUploadedStandard } from "../src/lib/standard-import";
import { extractClause1ScopeOnly } from "../src/lib/scope-text";
import { ensureStandardPreviewRasters } from "../src/lib/preview-raster";

const prisma = new PrismaClient();

const FILES = {
  en: "public/uploads/standards/1793257940032-46b5a3-ARS_1184_2025__E__Fresh__frozen_and_canned_mackerel___Specification.pdf",
  fr: "public/uploads/standards/1793257942308-ddefa6-ARS_1184-2025__F__Maquereau_frais__congel__et_en_conserve___Sp_cifications.pdf",
} as const;

async function storeCopy(rel: string, label: string) {
  const src = path.join(process.cwd(), rel);
  const buf = await readFile(src);
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "standards");
  await mkdir(uploadsDir, { recursive: true });
  const storedName = `${Date.now()}-${randomBytes(3).toString("hex")}-ARS_1184_${label}.pdf`;
  const dest = path.join(uploadsDir, storedName);
  await copyFile(src, dest);
  return { uri: `/uploads/standards/${storedName}`, buf };
}

async function main() {
  const existing = await prisma.standard.findUnique({ where: { designation: "ARS 1184" } });
  if (existing) {
    console.log("ARS 1184 already exists:", existing.id);
    return;
  }

  const tc =
    (await prisma.technicalCommittee.findFirst()) ||
    (() => {
      throw new Error("Create a technical committee before importing");
    })();

  const en = await storeCopy(FILES.en, "EN");
  const converted = await convertUploadedStandard({
    buffer: en.buf,
    fileName: "ARS_1184_EN.pdf",
    mimeType: "application/pdf",
    designationHint: "ARS 1184",
    titleHint: "Fresh, frozen and canned mackerel — Specification",
  });
  const pack = converted.pack;
  const scopeEn = extractClause1ScopeOnly(pack.scope.text.en);
  pack.scope = { text: { en: scopeEn } };
  pack.contentHash = `sha256:${createHash("sha256")
    .update(JSON.stringify({ ...pack, contentHash: undefined }))
    .digest("hex")}`;

  const fr = await storeCopy(FILES.fr, "FR");

  const stdId = `std-ars-1184-${randomBytes(2).toString("hex")}`;
  const verId = `sv-${randomBytes(4).toString("hex")}`;

  await prisma.standard.create({
    data: {
      id: stdId,
      designation: "ARS 1184",
      titleEn: "Fresh, frozen and canned mackerel — Specification",
      titleFr: "Maquereau frais, congelé et en conserve — Spécifications",
      ics: "67.120.30",
      publisher: "ARSO",
      kind: "PRODUCT",
      technicalCommitteeId: tc.id,
      versions: {
        create: {
          id: verId,
          editionLabel: pack.version.editionLabel || "ARS 1184:2025",
          year: pack.version.year || 2025,
          effectiveFrom: new Date(pack.version.effectiveFrom || "2025-01-01"),
          publicationStatus: "PUBLISHED",
          authoritativeLocale: "en",
          sourcePdfUri: en.uri,
          contentHash: pack.contentHash,
          scopeEn,
          machineDocJson: JSON.stringify(pack),
          requirementsJson: JSON.stringify(pack.requirements || []),
          normativeRefsJson: JSON.stringify(pack.normativeReferences || []),
          packagingJson: pack.packaging ? JSON.stringify(pack.packaging) : null,
          labellingJson: pack.labelling ? JSON.stringify(pack.labelling) : null,
          samplingJson: pack.sampling ? JSON.stringify(pack.sampling) : null,
          catalogItem: {
            create: {
              priceCents: 100,
              currency: "USD",
              coverTitle: `${pack.version.editionLabel || "ARS 1184:2025"} Fresh, frozen and canned mackerel — Specification`,
              previewScopeOnly: true,
              active: true,
              distribution: "PAID",
            },
          },
          languageFiles: {
            create: [
              { locale: "en", sourcePdfUri: en.uri },
              { locale: "fr", sourcePdfUri: fr.uri },
            ],
          },
        },
      },
    },
  });

  for (const [locale, uri] of [
    ["en", en.uri],
    ["fr", fr.uri],
  ] as const) {
    const rasters = await ensureStandardPreviewRasters({
      standardVersionId: verId,
      sourcePdfUri: uri,
      rasterKey: `${verId}-${locale}`,
    });
    console.log(locale, rasters?.manifest.scopeLabel, rasters?.manifest.pages.length, "pages");
  }

  const catalog = await prisma.catalogItem.findFirst({ where: { standardVersionId: verId } });
  console.log("imported", stdId, verId, "catalog", catalog?.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
