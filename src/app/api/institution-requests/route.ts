import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTHORITY_TYPES, isAuthorityType, isTradeOrgType } from "@/lib/rbac";
import { requireSession } from "@/lib/require-auth";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const session = auth.session!;
  const tradeAdmin = session.user.memberships.some(
    (membership) =>
      isTradeOrgType(membership.organization.type) &&
      (membership.role === "PRIMARY_ADMIN" || membership.role === "ORG_ADMIN"),
  );
  if (!tradeAdmin) return fail("Only an organisation admin can request an institution", 403);

  const pending = await prisma.institutionRequest.findFirst({
    where: { userId: session.userId, status: "PENDING" },
  });
  if (pending) return fail("You already have a request waiting for the system admin");

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const type = String(body.type || "").toUpperCase();
  const memberStateId = String(body.memberStateId || "").trim();
  if (!name) return fail("Institution name is required");
  if (!isAuthorityType(type) || !(AUTHORITY_TYPES as readonly string[]).includes(type)) {
    return fail("Choose an institution type");
  }
  const state = await prisma.memberState.findUnique({ where: { id: memberStateId } });
  if (!state) return fail("Choose a country");

  const row = await prisma.institutionRequest.create({
    data: { userId: session.userId, name, type, memberStateId: state.id },
  });
  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
