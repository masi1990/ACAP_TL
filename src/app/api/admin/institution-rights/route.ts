import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { createAuthorityAccount } from "@/lib/institution-account";
import { requirePermission } from "@/lib/require-auth";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Give an existing login a new institution. The manufacturer company on that login stays. */
export async function POST(req: NextRequest) {
  const auth = await requirePermission("institutions:write");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return fail("Enter the account email");
  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) {
    return fail("No account uses that email. The person must register first.", 404);
  }

  try {
    const org = await createAuthorityAccount({
      name: String(body.name || ""),
      type: String(body.type || ""),
      memberStateId: String(body.memberStateId || ""),
      adminUserId: user.id,
      grantedById: auth.session!.userId,
    });
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "INSTITUTION_RIGHTS_GRANT",
      entityType: "Organization",
      entityId: org.id,
      organizationId: org.id,
      after: { name: org.name, type: org.type, email: user.email },
    });
    return NextResponse.json({ ok: true, id: org.id }, { status: 201 });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not grant institutional rights");
  }
}
