import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { notifyAfterCommit, queueOrgInvite } from "@/lib/notifications";
import { assignableOrgRoles, canAssignAcrossOrganisations, managesSameAuthorityType } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const email = String(body.email || "").toLowerCase().trim();
  const role = String(body.role || "ORG_USER");
  const requestedOrg = body.organizationId ? String(body.organizationId).trim() : "";
  const arso = canAssignAcrossOrganisations(session.user);

  const requested = requestedOrg
    ? await prisma.organization.findUnique({ where: { id: requestedOrg } })
    : null;
  const ownsRequested = session.user.memberships.some(
    (item) => item.role === "PRIMARY_ADMIN" && item.organization.id === requestedOrg,
  );
  const ownsType = !!requested && managesSameAuthorityType(session.user, requested);
  const ownMembership = session.user.memberships.find((item) => item.role === "PRIMARY_ADMIN");
  const organizationId = arso && requestedOrg ? requestedOrg : ownsRequested || ownsType ? requestedOrg : ownMembership?.organization.id || "";
  if (!organizationId || (!arso && requestedOrg && !ownsRequested && !ownsType)) {
    return NextResponse.json({ error: "Only the main account can invite people into this organisation" }, { status: 403 });
  }

  const organization = requested?.id === organizationId ? requested : await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  const roleDef = await prisma.roleDefinition.findUnique({ where: { code: role } });
  if (!roleDef) {
    return NextResponse.json({ error: "Choose a role" }, { status: 400 });
  }
  if (
    !arso &&
    (roleDef.scope !== "ORG" || role === "PRIMARY_ADMIN" || !assignableOrgRoles(organization.type).includes(role))
  ) {
    return NextResponse.json({ error: "Choose a role this organisation can grant" }, { status: 403 });
  }
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const invite = await prisma.invitation.create({
    data: {
      organizationId,
      email,
      role,
      token: `invite-${randomBytes(8).toString("hex")}`,
      invitedById: session.userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    impersonatorId: session.impersonatorId,
    action: "ORG_INVITE",
    entityType: "Invitation",
    entityId: invite.id,
    organizationId,
    after: { email, role },
  });
  await queueOrgInvite(invite.id);
  await notifyAfterCommit();
  return NextResponse.json({
    message: `Invitation emailed to ${email}.`,
  });
}
