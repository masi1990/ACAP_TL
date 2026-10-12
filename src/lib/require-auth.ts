import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";

export type AuthedSession = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export async function requireSession() {
  const session = await getSessionUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  return { session };
}

export async function requirePermission(permission: Permission) {
  const result = await requireSession();
  if ("error" in result && result.error) return result;
  const session = result.session!;
  if (!can(session.user, permission)) {
    return {
      error: NextResponse.json(
        { error: `Forbidden — missing permission: ${permission}` },
        { status: 403 },
      ),
      session,
    };
  }
  return { session };
}
