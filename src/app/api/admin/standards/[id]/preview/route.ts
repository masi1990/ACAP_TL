import { NextResponse } from "next/server";
import { getAdminFullStandardPreview } from "@/lib/admin-standard-preview";
import { requirePermission } from "@/lib/require-auth";

type Ctx = { params: Promise<{ id: string }> };

/** Page images for the selected standard. The source PDF is not returned. */
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requirePermission("standards:preview_full");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    const data = await getAdminFullStandardPreview(id);
    if (!data) return NextResponse.json({ error: "Standard not found" }, { status: 404 });
    return NextResponse.json({ ...data, sourcePdfUri: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Standard preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
