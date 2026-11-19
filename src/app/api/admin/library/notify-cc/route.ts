import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listLibraryRequestCcEmails, saveLibraryRequestCcEmails } from "@/lib/library-request-notify";
import { isValidEmail } from "@/lib/utils";

export async function GET() {
  const session = await getSessionUser();
  if (!session || (!can(session.user, "institutions:write") && !can(session.user, "audit:read"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ emails: await listLibraryRequestCcEmails() });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || !can(session.user, "institutions:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.emails)
    ? body.emails
    : String(body.text || "")
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean);
  const invalid = raw.map((email: unknown) => String(email).trim()).filter((email: string) => email && !isValidEmail(email));
  if (invalid.length) {
    return NextResponse.json({ error: `Invalid email: ${invalid.slice(0, 5).join(", ")}` }, { status: 400 });
  }
  const emails = await saveLibraryRequestCcEmails(raw.map((email: unknown) => String(email)));
  return NextResponse.json({ ok: true, emails });
}
