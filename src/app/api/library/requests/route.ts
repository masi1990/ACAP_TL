import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { countryAllowed, isLibraryInstitution, logLibraryActivity } from "@/lib/library";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const organizationId = String(body.organizationId || "").trim();
  const memberStateId = String(body.memberStateId || "").trim();
  const pending = await prisma.libraryAccessRequest.findFirst({
    where: { userId: session.userId, status: "PENDING" },
  });
  if (pending) return NextResponse.json({ error: "You already have a request waiting" }, { status: 409 });
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { operatingCountries: true },
  });
  if (!org || !isLibraryInstitution(org) || !countryAllowed(org, memberStateId)) {
    return NextResponse.json({ error: "Choose an institution and a country it covers" }, { status: 400 });
  }
  const row = await prisma.libraryAccessRequest.create({
    data: { userId: session.userId, organizationId: org.id, memberStateId },
  });
  await logLibraryActivity({
    userId: session.userId,
    organizationId: org.id,
    memberStateId,
    action: "ROLE_REQUESTED",
    detail: "Standards officer",
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "LIBRARY_ROLE_REQUEST",
    entityType: "LibraryAccessRequest",
    entityId: row.id,
    organizationId: org.id,
  });
  return NextResponse.json({ ok: true });
}
