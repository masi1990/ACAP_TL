import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_PATH, destroySession } from "@/lib/auth";

export async function POST() {
  await destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: SESSION_COOKIE_PATH,
    maxAge: 0,
  });
  return res;
}
