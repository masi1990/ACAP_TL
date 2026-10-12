import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const membership = session.user.memberships.find((m) =>
    ["PRIMARY_ADMIN", "ORG_ADMIN"].includes(m.role),
  );
  if (!membership) {
    return NextResponse.json({ error: "Primary admin / org admin required" }, { status: 403 });
  }
  const body = await req.json();
  const email = String(body.email || "").toLowerCase().trim();
  const role = String(body.role || "ORG_USER");
  const invite = await prisma.invitation.create({
    data: {
      organizationId: membership.organizationId,
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
    organizationId: membership.organizationId,
    after: { email, role },
  });
  return NextResponse.json({
    message: `Invitation created for ${email} (email delivery stubbed). Token ${invite.token}`,
  });
}
