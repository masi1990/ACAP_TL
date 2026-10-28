import { NextRequest, NextResponse } from "next/server";
import { consumePasswordReset } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  if (!token) return NextResponse.json({ error: "This link is no longer valid" }, { status: 400 });
  try {
    await consumePasswordReset(token, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "This link is no longer valid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
