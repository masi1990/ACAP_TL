import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { issueCertificateOfConformity } from "@/lib/coc";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  try {
    const result = await issueCertificateOfConformity({
      applicationId: String(body.applicationId),
      actorUserId: session.userId,
      impersonatorId: session.impersonatorId || undefined,
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
    });
    return NextResponse.json({
      message: result.reused
        ? `CoC already issued (idempotent): ${result.coc.certificateNo}`
        : `Issued ${result.coc.certificateNo} with PINs and expiry reminder jobs`,
      certificateNo: result.coc.certificateNo,
      reused: result.reused,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Issue failed" }, { status: 400 });
  }
}
