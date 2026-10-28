import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { originClaimFromBody } from "@/lib/origin-claim";
import { deleteTradeProduct, ecoTrackFromBody, materializeStandardItems, ProductRecordError, resolveCertifyingCb, resolveTariffLineId } from "@/lib/product-record";
import { isTradeOrgType } from "@/lib/rbac";
import { requirePermission } from "@/lib/require-auth";

type Ctx = { params: Promise<{ id: string }> };
const EDITABLE = new Set(["PENDING_APPROVAL", "REJECTED", "DRAFT"]);

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("products:write");
  if (auth.error) return auth.error;
  const session = auth.session!;
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      standardLinks: true,
      applications: { include: { coc: true } },
      company: { include: { clientAccount: true } },
    },
  });
  if (!product) return fail("Product not found", 404);
  const ownerId = product.company.clientAccount.organizationId;
  if (!session.user.memberships.some((membership) => membership.organization.id === ownerId && isTradeOrgType(membership.organization.type))) {
    return fail("You can only edit products for your own company", 403);
  }
  if (product.applications.some((application) => application.coc)) {
    return fail("A certified product cannot be edited or deleted", 409);
  }
  if (product.applications.some((application) => !EDITABLE.has(application.status))) {
    return fail("The certification body has accepted this product. It cannot be edited or deleted.");
  }
  const application = product.applications[0];

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const commodity = String(body.commodity || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  const organizationId = String(body.organizationId || ownerId).trim();
  if (!name || !commodity || !standardVersionId) return fail("Product, commodity, and standard are required");
  if (
    !session.user.memberships.some(
      (membership) => membership.organization.id === organizationId && isTradeOrgType(membership.organization.type),
    )
  ) {
    return fail("You can only move a product to your own company", 403);
  }

  const [organization, version] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: { memberState: true, clientAccounts: { include: { companies: true } } },
    }),
    prisma.standardVersion.findUnique({ where: { id: standardVersionId } }),
  ]);
  if (!organization || organization.status === "REJECTED") return fail("Choose an active or pending company");
  if (!version) return fail("Standard not found");

  try {
    const claim = originClaimFromBody(body, { importer: organization.type === "IMPORTER" });
    const certifyingCbId = await resolveCertifyingCb(body.certifyingCbId, organization.servicingCbId);
    const tariffLineId = await resolveTariffLineId(standardVersionId, body.tariffLineId);
    const company = organization.clientAccounts.flatMap((account) => account.companies)[0];
    if (!company) return fail("This company has no company record");
    const marks = await ecoTrackFromBody(body);
    const ecoVersionId = marks.ecoStandardVersionId;
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          companyId: company.id,
          name,
          commodity,
          originClaimJson: JSON.stringify(claim),
          tariffLineId,
          certifyingCbId,
        },
      });
      const qualityLink = product.standardLinks.find((link) => link.markScheme === "QUALITY");
      if (qualityLink) {
        await tx.productStandardLink.update({
          where: { id: qualityLink.id },
          data: { standardVersionId },
        });
      } else {
        await tx.productStandardLink.create({
          data: { productId: id, markScheme: "QUALITY", standardVersionId },
        });
      }
      const qualityApp =
        product.applications.find((row) => row.markScheme === "QUALITY") || application;
      if (qualityApp) {
        await tx.certificationApplication.update({
          where: { id: qualityApp.id },
          data: { organizationId: certifyingCbId, standardVersionId, markScheme: "QUALITY", status: "PENDING_APPROVAL" },
        });
      }
      const ecoLink = product.standardLinks.find((link) => link.markScheme === "ECO");
      const ecoApp = product.applications.find((row) => row.markScheme === "ECO");
      if (marks.coverage === "BOTH" && ecoVersionId) {
        if (ecoLink) {
          await tx.productStandardLink.update({
            where: { id: ecoLink.id },
            data: { standardVersionId: ecoVersionId },
          });
        } else {
          await tx.productStandardLink.create({
            data: { productId: id, markScheme: "ECO", standardVersionId: ecoVersionId },
          });
        }
        if (ecoApp) {
          await tx.certificationApplication.update({
            where: { id: ecoApp.id },
            data: { organizationId: certifyingCbId, standardVersionId: ecoVersionId, status: "PENDING_APPROVAL" },
          });
        } else {
          await tx.certificationApplication.create({
            data: {
              productId: id,
              organizationId: certifyingCbId,
              standardVersionId: ecoVersionId,
              status: "PENDING_APPROVAL",
              markScheme: "ECO",
            },
          });
        }
      } else if (ecoApp) {
        await tx.certificationApplication.delete({ where: { id: ecoApp.id } });
        if (ecoLink) await tx.productStandardLink.delete({ where: { id: ecoLink.id } });
      }
    });
    const saved = await prisma.certificationApplication.findMany({ where: { productId: id } });
    for (const row of saved) {
      const doc = row.markScheme === "ECO" ? marks.ecoMachineDocJson : version.machineDocJson;
      if (doc) await materializeStandardItems(row.id, doc);
    }
    await appendAuditEvent({
      actorUserId: session.userId,
      action: "PRODUCT_SUBMIT_UPDATE",
      entityType: "Product",
      entityId: id,
      organizationId,
      after: { name, status: "PENDING_APPROVAL" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Request failed", err instanceof ProductRecordError ? err.status : 400);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("products:write");
  if (auth.error) return auth.error;
  const session = auth.session!;
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      applications: { include: { coc: true } },
      company: { include: { clientAccount: true } },
    },
  });
  if (!product) return fail("Product not found", 404);
  const ownerId = product.company.clientAccount.organizationId;
  if (!session.user.memberships.some((membership) => membership.organization.id === ownerId && isTradeOrgType(membership.organization.type))) {
    return fail("You can only delete products for your own company", 403);
  }
  if (product.applications.some((application) => application.coc)) {
    return fail("A certified product cannot be edited or deleted", 409);
  }
  if (product.applications.some((application) => !EDITABLE.has(application.status))) {
    return fail("The certification body has accepted this product. It cannot be edited or deleted.");
  }
  try {
    await deleteTradeProduct(session, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Delete failed", err instanceof ProductRecordError ? err.status : 400);
  }
}
