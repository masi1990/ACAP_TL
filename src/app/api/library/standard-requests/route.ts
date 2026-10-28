import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { countryAllowed, isLibraryInstitution, logLibraryActivity } from "@/lib/library";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || session?.user.email || "").toLowerCase().trim();
  const name = String(body.name || session?.user.name || "").trim();
  const organizationId = String(body.organizationId || "").trim();
  const memberStateId = String(body.memberStateId || "").trim();
  const note = String(body.note || "").trim();
  const standardIds = Array.isArray(body.standardIds) ? body.standardIds.map((id: unknown) => String(id)) : [];
  if (!email || !name) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  if (!standardIds.length) return NextResponse.json({ error: "Choose at least one standard" }, { status: 400 });
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { operatingCountries: true },
  });
  if (!org || !isLibraryInstitution(org) || !countryAllowed(org, memberStateId)) {
    return NextResponse.json({ error: "Choose an institution and a country it covers" }, { status: 400 });
  }
  const standards = await prisma.standard.findMany({
    where: { id: { in: standardIds }, versions: { some: { publicationStatus: "PUBLISHED" } } },
    select: { id: true },
  });
  if (!standards.length) return NextResponse.json({ error: "Choose published standards" }, { status: 400 });
  const row = await prisma.libraryStandardRequest.create({
    data: {
      email,
      name,
      userId: session?.userId || null,
      organizationId: org.id,
      memberStateId,
      note,
      items: { create: standards.map((standard) => ({ standardId: standard.id })) },
    },
  });
  await logLibraryActivity({
    userId: session?.userId,
    organizationId: org.id,
    memberStateId,
    action: "STANDARD_REQUEST",
    detail: email,
  });
  await appendAuditEvent({
    actorUserId: session?.userId,
    action: "LIBRARY_STANDARD_REQUEST",
    entityType: "LibraryStandardRequest",
    entityId: row.id,
    organizationId: org.id,
    after: { email, count: standards.length },
  });
  return NextResponse.json({ ok: true });
}
