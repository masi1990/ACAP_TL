import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { clauseInsertIndex } from "@/lib/standard-assessment";

type Ctx = { params: Promise<{ id: string }> };

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

type ManualRequirement = {
  id: string;
  clause: string;
  heading: string;
  text: string;
  testMethod: string;
  kind: "clause" | "table";
  section: string;
};

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const clause = clean(body.clause, 40);
  const heading = clean(body.heading, 200);
  const requirement = clean(body.requirement, 4000);
  const limit = clean(body.limit, 500);
  const testMethod = clean(body.testMethod, 300);
  const sectionTitle = (limit ? [heading, requirement] : [heading || requirement]).filter(Boolean).join(" — ");
  const section = `${clause} ${sectionTitle}`.replace(/\s+/g, " ").trim();

  if (!clause) return NextResponse.json({ error: "Clause number is required" }, { status: 400 });
  if (!requirement) return NextResponse.json({ error: "Requirement text is required" }, { status: 400 });

  const standard = await prisma.standard.findUnique({ where: { id }, select: { id: true, designation: true } });
  if (!standard) return NextResponse.json({ error: "Standard not found" }, { status: 404 });

  const latest = await prisma.standardVersion.findFirst({
    where: { standardId: id },
    orderBy: { year: "desc" },
  });
  if (!latest) return NextResponse.json({ error: "This standard has no version to update" }, { status: 404 });

  let machine: Record<string, unknown> = {};
  try {
    machine = JSON.parse(latest.machineDocJson) as Record<string, unknown>;
  } catch {
    machine = {};
  }

  const manual = Array.isArray(machine.manualRequirements)
    ? (machine.manualRequirements as ManualRequirement[])
    : [];
  const duplicate = manual.some(
    (row) =>
      clean(row.clause, 40).toLowerCase() === clause.toLowerCase() &&
      clean(row.kind === "table" ? row.heading : row.text, 4000).toLowerCase() === requirement.toLowerCase(),
  );
  if (duplicate) {
    return NextResponse.json({ error: "That clause is already on this standard" }, { status: 409 });
  }

  const row: ManualRequirement = {
    id: `man-${randomBytes(4).toString("hex")}`,
    clause,
    heading: limit ? [heading, requirement].filter(Boolean).join(" — ") : heading,
    text: limit || requirement,
    testMethod,
    kind: limit ? "table" : "clause",
    section,
  };

  machine.manualRequirements = [...manual, row];
  const packed = Array.isArray(machine.requirements) ? [...machine.requirements] : [];
  packed.push({
    id: row.id,
    clause: row.clause,
    text: limit ? `${requirement} — ${limit}` : requirement,
    manual: true,
  });
  machine.requirements = packed;

  let stored: unknown[] = [];
  try {
    const parsed = JSON.parse(latest.requirementsJson) as unknown;
    stored = Array.isArray(parsed) ? parsed : [];
  } catch {
    stored = [];
  }
  stored.push({
    id: row.id,
    clause: row.clause,
    text: limit ? `${requirement} — ${limit}` : requirement,
    manual: true,
  });

  await prisma.standardVersion.update({
    where: { id: latest.id },
    data: {
      machineDocJson: JSON.stringify(machine),
      requirementsJson: JSON.stringify(stored),
    },
  });

  const openApplications = await prisma.certificationApplication.findMany({
    where: {
      standardVersionId: latest.id,
      assessmentItems: { some: { source: "STANDARD" } },
    },
      select: {
      id: true,
      assessmentItems: {
        where: { source: "STANDARD" },
        select: { clause: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  for (const application of openApplications) {
    const items = application.assessmentItems;
    const at = clauseInsertIndex(
      items.map((item) => item.clause),
      row.clause,
    );
    const sortOrder = items[at]?.sortOrder ?? (items[items.length - 1]?.sortOrder ?? -1) + 1;
    if (items[at]) {
      await prisma.assessmentItem.updateMany({
        where: { applicationId: application.id, source: "STANDARD", sortOrder: { gte: sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });
    }
    await prisma.assessmentItem.create({
      data: {
        applicationId: application.id,
        source: "STANDARD",
        kind: row.kind,
        itemKey: `manual:${row.id}`,
        section: row.section,
        clause: row.clause,
        heading: row.heading,
        text: row.text,
        testMethod: row.testMethod,
        sortOrder,
      },
    });
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "STANDARD_REQUIREMENT_ADD",
    entityType: "StandardVersion",
    entityId: latest.id,
    after: { standardId: id, designation: standard.designation, clause: row.clause, requirement },
    reason: "Manual clause added because the machine pack missed it",
  });

  return NextResponse.json({
    ok: true,
    item: {
      itemKey: `manual:${row.id}`,
      section: row.section,
      clause: row.clause,
      heading: row.heading,
      text: row.text,
      testMethod: row.testMethod,
      kind: row.kind,
    },
  });
}
