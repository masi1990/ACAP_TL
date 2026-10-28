import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("standards:read");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const row = await prisma.standard.findUnique({
    where: { id },
    include: {
      technicalCommittee: { include: { sector: true } },
      adoptions: { include: { memberState: true } },
      versions: {
        include: {
          catalogItem: true,
          languageFiles: true,
          tariffMaps: { include: { tariffLine: { include: { rec: true } } } },
        },
      },
    },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const { body, files } = await readStandardPayload(req);
  const before = await prisma.standard.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let kind: string | undefined;
  if (body.kind != null && String(body.kind).trim()) {
    const parsed = standardKindOrNull(body.kind);
    if (!parsed) return NextResponse.json({ error: "Choose a standard kind from the list" }, { status: 400 });
    kind = parsed;
  }
  let technicalCommitteeId: string | undefined;
  if (body.technicalCommitteeId !== undefined) {
    try {
      technicalCommitteeId = (await requireTechnicalCommittee(String(body.technicalCommitteeId || ""))).id;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Choose a technical committee" },
        { status: 400 },
      );
    }
  }

  const row = await prisma.standard.update({
    where: { id },
    data: {
      designation: body.designation != null ? String(body.designation).trim() : undefined,
      titleEn: body.titleEn != null ? String(body.titleEn).trim() : undefined,
      titleFr: body.titleFr === undefined ? undefined : body.titleFr,
      titlePt: body.titlePt === undefined ? undefined : body.titlePt,
      titleAr: body.titleAr === undefined ? undefined : body.titleAr,
      ics: body.ics != null ? String(body.ics).trim() : undefined,
      publisher: body.publisher != null ? String(body.publisher).trim() : undefined,
      kind,
      technicalCommitteeId,
    },
  });

  const latest = await prisma.standardVersion.findFirst({
    where: { standardId: id },
    orderBy: { year: "desc" },
    include: { catalogItem: true },
  });

  if (
    latest &&
    (body.scopeEn != null ||
      body.editionLabel != null ||
      body.publicationStatus != null ||
      body.authoritativeLocale != null ||
      body.year != null)
  ) {
    let machineDocJson: string | undefined;
    if (body.scopeEn != null) {
      let machine: Record<string, unknown> = {};
      try {
        machine = JSON.parse(latest.machineDocJson) as Record<string, unknown>;
      } catch {
        machine = {};
      }
      const scope =
        machine.scope && typeof machine.scope === "object"
          ? (machine.scope as { text?: { en?: string } })
          : {};
      machine.scope = { ...scope, text: { ...(scope.text || {}), en: String(body.scopeEn) } };
      machineDocJson = JSON.stringify(machine);
    }
    const publicationStatus =
      body.publicationStatus != null ? publicationStatusOrNull(body.publicationStatus) : undefined;
    if (body.publicationStatus != null && !publicationStatus) {
      return NextResponse.json({ error: "Choose a publication status from the list" }, { status: 400 });
    }
    const authoritativeLocale =
      body.authoritativeLocale != null ? authoritativeLocaleOrNull(body.authoritativeLocale) : undefined;
    if (body.authoritativeLocale != null && !authoritativeLocale) {
      return NextResponse.json({ error: "Choose a language from the list" }, { status: 400 });
    }
    const languageForSource = authoritativeLocale || latest.authoritativeLocale;
    const matchedFile = await prisma.standardLanguageFile.findUnique({
      where: { standardVersionId_locale: { standardVersionId: latest.id, locale: languageForSource } },
    });
    await prisma.standardVersion.update({
      where: { id: latest.id },
      data: {
        scopeEn: body.scopeEn != null ? String(body.scopeEn) : undefined,
        editionLabel: body.editionLabel != null ? String(body.editionLabel) : undefined,
        publicationStatus: publicationStatus ?? undefined,
        authoritativeLocale: authoritativeLocale ?? undefined,
        year: body.year != null && Number.isFinite(Number(body.year)) ? Number(body.year) : undefined,
        machineDocJson,
        sourcePdfUri: matchedFile?.sourcePdfUri,
      },
    });
  }

  if (latest && body.publishToStore != null) {
    const publish = Boolean(body.publishToStore);
    if (publish && !latest.catalogItem) {
      return NextResponse.json(
        { error: "Set a price on the Price table before listing this standard" },
        { status: 400 },
      );
    }
    if (latest.catalogItem) {
      const coverTitle = `${body.editionLabel != null ? String(body.editionLabel) : latest.editionLabel} ${
        body.titleEn != null ? String(body.titleEn).trim() : row.titleEn
      }`;
      await prisma.catalogItem.update({
        where: { id: latest.catalogItem.id },
        data: { active: publish, coverTitle },
      });
    }
  }

  // Replace tariff maps when tariffLineIds is provided (one standard → many lines)
  if (latest && body.tariffLineIds !== undefined) {
    const { randomBytes } = await import("crypto");
    const rawMap = body.tariffLineIds;
    const tariffLineIds: string[] = Array.isArray(rawMap)
      ? rawMap.map(String).filter(Boolean)
      : rawMap
        ? [String(rawMap)]
        : [];
    await prisma.standardTariffMap.deleteMany({ where: { standardVersionId: latest.id } });
    for (const tariffLineId of tariffLineIds) {
      await prisma.standardTariffMap.create({
        data: {
          id: `map-${randomBytes(4).toString("hex")}`,
          standardVersionId: latest.id,
          tariffLineId,
          mappingEffect: "include",
          effectiveFrom: new Date(),
        },
      });
    }
  }

  if (body.memberStateIds !== undefined) {
    try {
      await replaceStandardAdoptions(id, parseIdList(body.memberStateIds));
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Choose adopting countries from the list" },
        { status: 400 },
      );
    }
  }

  if (latest && Object.keys(files).length) {
    try {
      const locale = authoritativeLocaleOrNull(body.authoritativeLocale) || latest.authoritativeLocale;
      await attachLanguageFiles(latest.id, files, locale);
      const version = await prisma.standardVersion.findUnique({ where: { id: latest.id } });
      await ensureAuthoritativeLanguageFile(latest.id, locale, version?.sourcePdfUri);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not save language files" },
        { status: 400 },
      );
    }
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "STANDARD_UPDATE",
    entityType: "Standard",
    entityId: id,
    before: before,
    after: row,
  });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("standards:delete");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const before = await prisma.standard.findUnique({
    where: { id },
    include: { versions: { include: { _count: { select: { applications: true, tariffMaps: true } } } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  for (const v of before.versions) {
    if (v._count.applications > 0) {
      return NextResponse.json({ error: "Standard has certification applications — cannot delete" }, { status: 409 });
    }
    await prisma.standardTariffMap.deleteMany({ where: { standardVersionId: v.id } });
    await prisma.standardLanguageFile.deleteMany({ where: { standardVersionId: v.id } });
    await prisma.catalogItem.deleteMany({ where: { standardVersionId: v.id } });
    await prisma.nationalRuleLink.deleteMany({ where: { standardVersionId: v.id } });
    await prisma.productStandardLink.deleteMany({ where: { standardVersionId: v.id } });
    await prisma.standardVersion.delete({ where: { id: v.id } });
  }
  await prisma.standard.delete({ where: { id } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "STANDARD_DELETE",
    entityType: "Standard",
    entityId: id,
    before: { designation: before.designation },
  });
  return NextResponse.json({ ok: true });
}
