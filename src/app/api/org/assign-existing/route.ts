import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { assignableOrgRoles, canAssignAcrossOrganisations, isTradeOrgType, managesSameAuthorityType } from "@/lib/rbac";
import { grantOrgRole } from "@/lib/org-accounts";
import { appointStandardsOfficer } from "@/lib/library";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const role = String(body.role || "").trim();
  const organizationId = String(body.organizationId || "").trim();
  if (!email || !role || !organizationId) {
    return NextResponse.json({ error: "Email, role, and organisation are required" }, { status: 400 });
  }

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  const arso = canAssignAcrossOrganisations(session.user);
  const primary = session.user.memberships.some(
    (item) => item.role === "PRIMARY_ADMIN" && item.organization.id === organizationId,
  );
  const ownsType = managesSameAuthorityType(session.user, organization);
  if (!arso && !primary && !ownsType) {
    return NextResponse.json({ error: "Only the main account can assign people in this organisation" }, { status: 403 });
  }
  const roleDef = await prisma.roleDefinition.findUnique({ where: { code: role } });
  if (!roleDef || roleDef.scope !== "ORG" || role === "PRIMARY_ADMIN" || !assignableOrgRoles(organization.type).includes(role)) {
    return NextResponse.json({ error: "Choose a role this organisation can grant" }, { status: 403 });
  }
  if (!arso && isTradeOrgType(organization.type) && role !== "ORG_VIEWER") {
    return NextResponse.json({ error: "A manufacturer can grant view only" }, { status: 403 });
  }

  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No account with that email. Send an invitation instead." }, { status: 404 });
  }
  if (role === "LIBRARY_OFFICER") {
    const memberStateId =
      organization.memberStateId ||
      (await prisma.organizationCountry.findFirst({ where: { organizationId } }))?.memberStateId;
    if (!memberStateId) {
      return NextResponse.json({ error: "This institution has no country" }, { status: 400 });
    }
    await appointStandardsOfficer({
      userId: user.id,
      organizationId,
      memberStateId,
      grantedById: session.userId,
      scope: "FULL",
    });
  } else {
    await grantOrgRole({
      userId: user.id,
      organizationId,
      roleCode: role,
      grantedById: session.userId,
    });
  }
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "ORG_ROLE_ASSIGN_EXISTING",
    entityType: "UserAccount",
    entityId: user.id,
    organizationId,
    after: { email, role },
  });
  return NextResponse.json({ ok: true, message: `${user.name || email} can now open this organisation as ${roleDef.name}.` });
}
