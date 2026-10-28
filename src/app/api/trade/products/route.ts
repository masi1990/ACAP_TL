import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { originClaimFromBody } from "@/lib/origin-claim";
import {
  createTradeProduct,
  ecoTrackFromBody,
  ensureCompany,
  ProductRecordError,
  resolveCertifyingCb,
  resolveTariffLineId,
} from "@/lib/product-record";
import { isTradeOrgType } from "@/lib/rbac";
import { requirePermission } from "@/lib/require-auth";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Manufacturer submission. Certification stays pending until the chosen body accepts the product. */
export async function POST(req: NextRequest) {
  const auth = await requirePermission("products:write");
  if (auth.error) return auth.error;
  const session = auth.session!;
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim();
  const commodity = String(body.commodity || "").trim();
  const organizationId = String(body.organizationId || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  if (!name || !commodity || !organizationId || !standardVersionId) {
    return fail("Name, commodity, company, and standard are required");
  }

  const member = session.user.memberships.some(
    (membership) => membership.organization.id === organizationId && isTradeOrgType(membership.organization.type),
  );
  if (!member) return fail("You can only add products for your own company", 403);

  const [organization, version] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: { memberState: true, clientAccounts: { include: { companies: true } } },
    }),
    prisma.standardVersion.findUnique({ where: { id: standardVersionId } }),
  ]);
  if (!organization || !isTradeOrgType(organization.type)) return fail("Company not found");
  if (organization.status === "REJECTED") return fail("This company was rejected");
  if (!version) return fail("Standard not found");

  try {
    const claim = originClaimFromBody(body, { importer: organization.type === "IMPORTER" });
    const marks = await ecoTrackFromBody(body);
    const certifyingCbId = await resolveCertifyingCb(body.certifyingCbId, organization.servicingCbId);
    const product = await createTradeProduct({
      companyId: await ensureCompany(organization, claim.originIso2),
      name,
      commodity,
      standardVersionId,
      machineDocJson: version.machineDocJson,
      originClaimJson: JSON.stringify(claim),
      tariffLineId: await resolveTariffLineId(standardVersionId, body.tariffLineId),
      servicingCbId: certifyingCbId,
      coverage: marks.coverage,
      ecoStandardVersionId: marks.ecoStandardVersionId,
      ecoMachineDocJson: marks.ecoMachineDocJson,
      applicationStatus: "PENDING_APPROVAL",
    });
    await appendAuditEvent({
      actorUserId: session.userId,
      action: "PRODUCT_SUBMIT",
      entityType: "Product",
      entityId: product.id,
      organizationId: organization.id,
      after: { name, standardVersionId, status: "PENDING_APPROVAL" },
    });
    return NextResponse.json({ ok: true, id: product.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = err instanceof ProductRecordError ? err.status : 400;
    return fail(message, status);
  }
}
