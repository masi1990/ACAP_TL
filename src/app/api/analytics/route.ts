import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { operationsAnalytics, pipelineAnalytics, publicAnalytics } from "@/lib/analytics";
import { canOpenHubTools } from "@/lib/navigation";

export async function GET() {
  const session = await getSessionUser();
  const payload = {
    public: await publicAnalytics(),
    ...(session ? { pipeline: await pipelineAnalytics() } : {}),
    ...(session && canOpenHubTools(session.user) ? { operations: await operationsAnalytics() } : {}),
  };
  return NextResponse.json({ ok: true, ...payload });
}
