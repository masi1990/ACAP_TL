import { NextRequest, NextResponse } from "next/server";
import { sendPasswordReset } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  if (email.includes("@")) {
    await sendPasswordReset(email);
  }
  return NextResponse.json({
    ok: true,
    message: "If that email is registered, a reset link is on its way.",
  });
}
