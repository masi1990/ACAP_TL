import { NextResponse } from "next/server";
import { getAdminFullStandardPreview } from "@/lib/admin-standard-preview";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { memberMayViewStandard } from "@/lib/product-view-access";
import { getStandardPreviewByVersionId } from "@/lib/store-preview-server";

type Ctx = { params: Promise<{ id: string }> };

/** Page-image preview of a standard. The source PDF is not returned. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const auth = await requirePermission("customs:decide");
  const inspect = auth.error ? await requirePermission("inspect:write") : null;
  const session = auth.session ?? inspect?.session;
  const fullAccess = !auth.error || (inspect != null && !inspect.error);
  if (!fullAccess) {
    if (!session || !(await memberMayViewStandard(session, id))) return auth.error;
  }

  try {
    if (fullAccess) {
      const data = await getAdminFullStandardPreview(id);
      if (!data) return NextResponse.json({ error: "Standard not found" }, { status: 404 });
      return NextResponse.json({ ...data, sourcePdfUri: null });
    }
    const standard = await prisma.standard.findUnique({
      where: { id },
      select: { versions: { orderBy: { year: "desc" }, take: 1, select: { id: true } } },
    });
    const versionId = standard?.versions[0]?.id;
    if (!versionId) return NextResponse.json({ error: "Standard not found" }, { status: 404 });
    const data = await getStandardPreviewByVersionId(versionId);
    if (!data) return NextResponse.json({ error: "Standard not found" }, { status: 404 });
    return NextResponse.json({ ...data, mode: "scope", sourcePdfUri: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Standard preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
