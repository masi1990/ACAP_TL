import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { createSession, hashPassword } from "@/lib/auth";
import { grantGlobalRole, grantOrgRole } from "@/lib/org-accounts";
import { appointStandardsOfficer } from "@/lib/library";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ error: "Invitation not found" }, { status: 400 });

  const invite = await prisma.invitation.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
  }

  const email = invite.email.toLowerCase();
  let user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) {
    const password = String(body.password || "");
    const name = String(body.name || "").trim() || email;
    if (password.length < 8) {
      return NextResponse.json({ error: "Choose a password of at least 8 characters" }, { status: 400 });
    }
    user = await prisma.userAccount.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        emailVerified: true,
      },
    });
  }

  const roleDef = await prisma.roleDefinition.findUnique({ where: { code: invite.role } });
  if (roleDef?.scope === "GLOBAL") {
    await grantGlobalRole({
      userId: user.id,
      roleCode: invite.role,
      grantedById: invite.invitedById,
    });
  } else {
    if (invite.role === "LIBRARY_OFFICER") {
      const org = await prisma.organization.findUnique({
        where: { id: invite.organizationId },
        include: { operatingCountries: true },
      });
      const memberStateId = org?.memberStateId || org?.operatingCountries[0]?.memberStateId;
      if (!org || !memberStateId) {
        return NextResponse.json({ error: "This institution has no country" }, { status: 400 });
      }
      await appointStandardsOfficer({
        userId: user.id,
        organizationId: org.id,
        memberStateId,
        grantedById: invite.invitedById,
        scope: "FULL",
      });
    } else {
      await grantOrgRole({
        userId: user.id,
        organizationId: invite.organizationId,
        roleCode: invite.role,
        grantedById: invite.invitedById,
      });
    }
  }
  await prisma.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await appendAuditEvent({
    actorUserId: user.id,
    action: "ORG_INVITE_ACCEPTED",
    entityType: "Invitation",
    entityId: invite.id,
    organizationId: invite.organizationId,
    after: { email, role: invite.role },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
