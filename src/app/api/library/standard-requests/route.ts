import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { countryAllowed, isLibraryInstitution, logLibraryActivity } from "@/lib/library";
import { standardVersionHasText } from "@/lib/library-text";
import { buildRequestLines, parseOtherItems } from "@/lib/library-standard-request";
import { listLibraryRequestCcEmails } from "@/lib/library-request-notify";
import { notifyAfterCommit, queueLibraryStandardRequest } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || session?.user.email || "").toLowerCase().trim();
  const name = String(body.name || session?.user.name || "").trim();
  const organizationId = String(body.organizationId || "").trim();
  const memberStateId = String(body.memberStateId || "").trim();
  const note = String(body.note || "").trim();
  const standardIds: string[] = Array.isArray(body.standardIds)
    ? [...new Set<string>(body.standardIds.map((id: unknown) => String(id)))]
    : [];
  const otherItems = parseOtherItems(body.otherItems);
  if (!email || !name) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  if (!standardIds.length && !otherItems.length) {
    return NextResponse.json({ error: "Choose at least one standard" }, { status: 400 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { operatingCountries: true },
  });
  if (!org || !isLibraryInstitution(org) || !countryAllowed(org, memberStateId)) {
    return NextResponse.json({ error: "Choose an institution and a country it covers" }, { status: 400 });
  }
  const standards = standardIds.length
    ? await prisma.standard.findMany({
        where: { id: { in: standardIds }, versions: { some: { publicationStatus: "PUBLISHED" } } },
        select: {
          id: true,
          designation: true,
          versions: {
            where: { publicationStatus: "PUBLISHED" },
            orderBy: { year: "desc" },
            take: 1,
            select: { sourcePdfUri: true, languageFiles: { select: { sourcePdfUri: true } } },
          },
        },
      })
    : [];
  if (standardIds.length && !standards.length && !otherItems.length) {
    return NextResponse.json({ error: "Choose published standards" }, { status: 400 });
  }
  const known = standards.map((standard) => ({
    id: standard.id,
    designation: standard.designation,
    missingText: !standardVersionHasText(standard.versions[0] || {}),
  }));
  const memberState = await prisma.memberState.findUnique({ where: { id: memberStateId }, select: { name: true } });
  const row = await prisma.libraryStandardRequest.create({
    data: {
      email,
      name,
      userId: session?.userId || null,
      organizationId: org.id,
      memberStateId,
      note,
      items: {
        create: [
          ...known.map((item) => ({ standardId: item.id, missingText: item.missingText })),
          ...otherItems.map((item) => ({
            standardId: null,
            designationText: item.designation,
            titleText: item.title,
            missingText: false,
          })),
        ],
      },
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
    after: { email, count: known.length + otherItems.length, other: otherItems.length },
  });
  const colleagueEmails = await listLibraryRequestCcEmails();
  await queueLibraryStandardRequest({
    requestId: row.id,
    email,
    name,
    organizationName: org.name,
    countryName: memberState?.name || memberStateId,
    note,
    lines: buildRequestLines({ known, other: otherItems }),
    colleagueEmails,
  });
  await notifyAfterCommit();
  return NextResponse.json({ ok: true });
}
