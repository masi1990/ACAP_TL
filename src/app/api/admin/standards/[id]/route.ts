import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("standards:read");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const row = await prisma.standard.findUnique({
    where: { id },
    include: {
      versions: {
        include: {
          catalogItem: true,
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
  const body = await req.json();
  const before = await prisma.standard.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    await prisma.standardVersion.update({
      where: { id: latest.id },
      data: {
        scopeEn: body.scopeEn != null ? String(body.scopeEn) : undefined,
        editionLabel: body.editionLabel != null ? String(body.editionLabel) : undefined,
        publicationStatus: body.publicationStatus != null ? String(body.publicationStatus) : undefined,
        year: body.year != null && Number.isFinite(Number(body.year)) ? Number(body.year) : undefined,
        machineDocJson,
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
