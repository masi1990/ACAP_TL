import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { assessMachinePackCompleteness } from "@/lib/fidelity";
import { authoritativeLocaleOrNull, publicationStatusOrNull } from "@/lib/publication";
import {
  attachLanguageFiles,
  ensureAuthoritativeLanguageFile,
  parseIdList,
  readStandardPayload,
  replaceStandardAdoptions,
  requireTechnicalCommittee,
  standardKindOrNull,
} from "@/lib/standard-meta";

export async function GET() {
  const auth = await requirePermission("standards:read");
  if (auth.error) return auth.error;
  const rows = await prisma.standard.findMany({
    include: {
      technicalCommittee: { include: { sector: true } },
      adoptions: { include: { memberState: true } },
      versions: {
        orderBy: { year: "desc" },
        include: {
          catalogItem: true,
          languageFiles: true,
          _count: { select: { tariffMaps: true } },
        },
      },
    },
    orderBy: { designation: "asc" },
  });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;
  const { body, files } = await readStandardPayload(req);

  const designation = String(body.designation || "").trim();
  const titleEn = String(body.titleEn || "").trim();
  const ics = String(body.ics || "").trim();
  const { extractClause1ScopeOnly } = await import("@/lib/scope-text");
  const scopeEn = extractClause1ScopeOnly(String(body.scopeEn || "").trim());
  const year = Number(body.year) || new Date().getFullYear();
  if (!designation || !titleEn || !scopeEn) {
    return NextResponse.json({ error: "designation, titleEn, and scopeEn are required" }, { status: 400 });
  }

  const publicationStatus =
    body.publicationStatus != null && String(body.publicationStatus).trim()
      ? publicationStatusOrNull(body.publicationStatus)
      : "DRAFT";
  if (!publicationStatus) {
    return NextResponse.json({ error: "Choose a publication status from the list" }, { status: 400 });
  }
  const authoritativeLocale =
    body.authoritativeLocale != null && String(body.authoritativeLocale).trim()
      ? authoritativeLocaleOrNull(body.authoritativeLocale)
      : "en";
  if (!authoritativeLocale) {
    return NextResponse.json({ error: "Choose a language from the list" }, { status: 400 });
  }
  const kind = body.kind != null && String(body.kind).trim() ? standardKindOrNull(body.kind) : "PRODUCT";
  if (!kind) {
    return NextResponse.json({ error: "Choose a standard kind from the list" }, { status: 400 });
  }
  let technicalCommitteeId: string;
  try {
    technicalCommitteeId = (await requireTechnicalCommittee(String(body.technicalCommitteeId || ""))).id;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Choose a technical committee" },
      { status: 400 },
    );
  }
  const memberStateIds = parseIdList(body.memberStateIds);
  if (memberStateIds.length) {
    const found = await prisma.memberState.count({ where: { id: { in: memberStateIds } } });
    if (found !== memberStateIds.length) {
      return NextResponse.json({ error: "Choose adopting countries from the African Union member states" }, { status: 400 });
    }
  }

  const editionLabel = String(body.editionLabel || `${designation}:${year}`).trim();
  type MachineDoc = {
    contentHash?: string;
    scope?: unknown;
    normativeReferences?: unknown;
    requirements?: unknown;
    packaging?: unknown;
    labelling?: unknown;
    sampling?: unknown;
    fullText?: unknown;
    standard?: unknown;
    version?: unknown;
  };
  const machine: MachineDoc =
    body.machineDoc && typeof body.machineDoc === "object"
      ? (body.machineDoc as MachineDoc)
      : {
          standard: { designation, title: { en: titleEn }, ics: ics.split(",").map((s: string) => s.trim()).filter(Boolean), publisher: body.publisher || "ARSO" },
          version: {
            year,
            editionLabel,
            effectiveFrom: new Date().toISOString().slice(0, 10),
            publicationStatus,
            authoritativeLocale,
            sourcePdfUri: body.sourcePdfUri || null,
          },
          scope: { text: { en: scopeEn } },
          normativeReferences: body.normativeReferences || [],
          requirements: body.requirements || [{ id: "SCOPE", clause: "1", text: scopeEn }],
          packaging: body.packaging || null,
          labelling: body.labelling || null,
          sampling: body.sampling || null,
          fullText: body.fullText || scopeEn,
        };

  if (!machine.contentHash) {
    machine.contentHash = `sha256:${createHash("sha256").update(JSON.stringify(machine)).digest("hex")}`;
  }

  const completeness = assessMachinePackCompleteness({
    scope: machine.scope,
    normativeReferences: Array.isArray(machine.normativeReferences) ? machine.normativeReferences : [],
    requirements: Array.isArray(machine.requirements) ? machine.requirements : [],
    packaging: machine.packaging,
    labelling: machine.labelling,
    sampling: machine.sampling,
    contentHash: machine.contentHash,
  });

  const stdId = `std-${designation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomBytes(2).toString("hex")}`;
  const verId = `sv-${randomBytes(4).toString("hex")}`;

  const standard = await prisma.standard.create({
    data: {
      id: stdId,
      designation,
      titleEn,
      titleFr: body.titleFr ? String(body.titleFr) : null,
      titlePt: body.titlePt ? String(body.titlePt) : null,
      titleAr: body.titleAr ? String(body.titleAr) : null,
      ics: ics || "00.000",
      publisher: String(body.publisher || "ARSO"),
      kind,
      technicalCommitteeId,
      versions: {
        create: {
          id: verId,
          editionLabel,
          year,
          effectiveFrom: body.effectiveFrom ? new Date(String(body.effectiveFrom)) : new Date(),
          publicationStatus,
          authoritativeLocale,
          sourcePdfUri: body.sourcePdfUri ? String(body.sourcePdfUri) : null,
          contentHash: machine.contentHash,
          scopeEn,
          machineDocJson: JSON.stringify(machine),
          requirementsJson: JSON.stringify(machine.requirements || []),
          normativeRefsJson: JSON.stringify(machine.normativeReferences || []),
          packagingJson: machine.packaging ? JSON.stringify(machine.packaging) : null,
          labellingJson: machine.labelling ? JSON.stringify(machine.labelling) : null,
          samplingJson: machine.sampling ? JSON.stringify(machine.sampling) : null,
          catalogItem:
            body.publishToStore && Number(body.priceCents) > 0
              ? {
                  create: {
                    priceCents: Math.round(Number(body.priceCents)),
                    currency: "USD",
                    coverTitle: `${editionLabel} ${titleEn}`,
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

  // Optional tariff maps (form may send a single id string)
  const rawMap = body.tariffLineIds;
  const tariffLineIds: string[] = Array.isArray(rawMap)
    ? rawMap.map(String)
    : rawMap
      ? [String(rawMap)]
      : [];
  for (const tariffLineId of tariffLineIds.filter(Boolean)) {
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

  try {
    await replaceStandardAdoptions(standard.id, memberStateIds);
    await attachLanguageFiles(verId, files, authoritativeLocale);
    const version = await prisma.standardVersion.findUnique({ where: { id: verId } });
    await ensureAuthoritativeLanguageFile(verId, authoritativeLocale, version?.sourcePdfUri);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save adoption or language files" },
      { status: 400 },
    );
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "STANDARD_CREATE",
    entityType: "Standard",
    entityId: standard.id,
    after: { designation, completeness },
  });

  return NextResponse.json({ ok: true, standard, completeness }, { status: 201 });
}
