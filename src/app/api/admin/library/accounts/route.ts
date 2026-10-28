import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { issuePasswordReset } from "@/lib/password-reset";
import { notifyAfterCommit } from "@/lib/notifications";
import { appointStandardsOfficer, createStaffPosting, logLibraryActivity, notifyStandardsOfficer } from "@/lib/library";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("institutions:write");
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const name = String(body.name || "").trim();
  const organizationId = String(body.organizationId || "").trim();
  const memberStateId = String(body.memberStateId || "").trim();
  if (!email || !organizationId || !memberStateId) {
    return NextResponse.json({ error: "Email, institution, and country are required" }, { status: 400 });
  }
  let user = await prisma.userAccount.findUnique({ where: { email } });
  let created = false;
  if (!user) {
    if (!name) return NextResponse.json({ error: "Enter a name for the new account" }, { status: 400 });
    user = await prisma.userAccount.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(randomBytes(24).toString("hex")),
        mustChangePassword: true,
        emailVerified: false,
      },
    });
    created = true;
    await issuePasswordReset(user);
    await notifyAfterCommit();
  }
  try {
    const org = await appointStandardsOfficer({
      userId: user.id,
      organizationId,
      memberStateId,
      grantedById: auth.session!.userId,
      scope: "FULL",
    });
    if (body.postingKind) {
      await createStaffPosting({
        userId: user.id,
        organizationId: org.id,
        kind: String(body.postingKind),
        officeName: String(body.officeName || ""),
        entryPointId: body.entryPointId ? String(body.entryPointId) : null,
        countryIso2: String(body.postingCountry || ""),
      });
    }
    await notifyStandardsOfficer(user, org.name);
    await logLibraryActivity({
      userId: auth.session!.userId,
      organizationId: org.id,
      memberStateId,
      roleCode: "ARSO_ADMIN",
      action: created ? "ACCOUNT_CREATED" : "ROLE_ASSIGNED",
      detail: email,
    });
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "LIBRARY_ROLE_ASSIGN",
      entityType: "UserAccount",
      entityId: user.id,
      organizationId: org.id,
      after: { email, created },
    });
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign the role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
