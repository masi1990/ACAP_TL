import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { deleteTradeProduct, ProductRecordError, updateTradeProduct } from "@/lib/product-record";

type Ctx = { params: Promise<{ id: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("products:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    await updateTradeProduct(auth.session!, id, body);
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "PRODUCT_UPDATE",
      entityType: "Product",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return fail(message, err instanceof ProductRecordError ? err.status : 400);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("products:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  try {
    await deleteTradeProduct(auth.session!, id);
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "PRODUCT_DELETE",
      entityType: "Product",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return fail(message, err instanceof ProductRecordError ? err.status : 400);
  }
}
