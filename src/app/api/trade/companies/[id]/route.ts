import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { isCountryCode } from "@/lib/countries";
import { deleteTradeProduct, ProductRecordError } from "@/lib/product-record";
import { isTradeOrgType } from "@/lib/rbac";
import { requireSession, type AuthedSession } from "@/lib/require-auth";

type Ctx = { params: Promise<{ id: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function adminMembership(session: AuthedSession, organizationId: string) {
  return session.user.memberships.find(
    (membership) =>
      membership.organization.id === organizationId &&
      isTradeOrgType(membership.organization.type) &&
      (membership.role === "PRIMARY_ADMIN" || membership.role === "ORG_ADMIN"),
  );
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  if (!adminMembership(auth.session!, id)) return fail("You can only edit your own companies", 403);

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      clientAccounts: {
        include: { companies: { include: { products: { include: { applications: { include: { coc: true } } } } } } },
      },
    },
  });
  if (!organization || !isTradeOrgType(organization.type)) return fail("Company not found", 404);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const type = String(body.type || organization.type).toUpperCase();
  const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
  const cbId = String(body.cbOrganizationId || organization.servicingCbId || "").trim();
  if (!name) return fail("Company name is required");
  if (type !== "MANUFACTURER" && type !== "IMPORTER") return fail("Choose a manufacturer or an importer");
  if (!isCountryCode(countryIso2)) return fail("Choose a country");
  const cb = await prisma.organization.findUnique({ where: { id: cbId } });
  if (!cb || cb.type !== "CB" || cb.status === "SUSPENDED") return fail("Choose an active certification body");

  const accepted = organization.status === "ACTIVE" || organization.status === "SUSPENDED";
  const locked = organization.clientAccounts.some((account) =>
    account.companies.some((company) =>
      company.products.some((product) =>
        product.applications.some(
          (application) => application.coc || !["PENDING_APPROVAL", "REJECTED", "DRAFT"].includes(application.status),
        ),
      ),
    ),
  );
  if ((accepted || locked) && (type !== organization.type || cb.id !== organization.servicingCbId)) {
    return fail("An accepted company keeps its kind and certification body.");
  }

  const status = organization.status === "REJECTED" || cb.id !== organization.servicingCbId ? "PENDING" : organization.status;

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id },
      data: { name, type, servicingCbId: cb.id, status },
    });
    await tx.clientAccount.updateMany({ where: { organizationId: id }, data: { displayName: name } });
    const companies = organization.clientAccounts.flatMap((account) => account.companies);
    for (const company of companies) {
      await tx.company.update({ where: { id: company.id }, data: { legalName: name, countryIso2 } });
      if (Array.isArray(body.operatingCountryIds)) {
        const ids = body.operatingCountryIds.map((id: unknown) => String(id));
        const states = await tx.memberState.findMany({ where: { id: { in: ids } }, select: { id: true } });
        await tx.companyCountry.deleteMany({ where: { companyId: company.id } });
        if (states.length) {
          await tx.companyCountry.createMany({
            data: states.map((state) => ({ companyId: company.id, memberStateId: state.id })),
          });
        }
      }
    }
    if (cb.id !== organization.servicingCbId) {
      const productIds = companies.flatMap((company) => company.products.map((product) => product.id));
      if (productIds.length) {
        await tx.product.updateMany({
          where: { id: { in: productIds }, applications: { none: { coc: { isNot: null } } } },
          data: { certifyingCbId: cb.id },
        });
        await tx.certificationApplication.updateMany({
          where: { productId: { in: productIds }, coc: { is: null } },
          data: { organizationId: cb.id, status: "PENDING_APPROVAL" },
        });
      }
    }
  });

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "TRADE_COMPANY_UPDATE",
    entityType: "Organization",
    entityId: id,
    organizationId: cb.id,
    after: { name, type, status },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const session = auth.session!;
  const { id } = await ctx.params;
  if (!adminMembership(session, id)) return fail("You can only delete your own companies", 403);

  const tradeCount = session.user.memberships.filter((membership) => isTradeOrgType(membership.organization.type)).length;
  if (tradeCount < 2) return fail("You cannot delete your only company");

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      clientAccounts: {
        include: {
          companies: {
            include: { products: { include: { applications: { include: { coc: true } } } } },
          },
        },
      },
    },
  });
  if (!organization) return fail("Company not found", 404);
  if (organization.status === "ACTIVE" || organization.status === "SUSPENDED") {
    return fail("The certification body has accepted this company. It cannot be deleted.", 409);
  }
  const products = organization.clientAccounts.flatMap((account) => account.companies.flatMap((company) => company.products));
  if (products.some((product) => product.applications.some((application) => application.coc))) {
    return fail("A company with a certified product cannot be deleted", 409);
  }
  if (
    products.some((product) =>
      product.applications.some((application) => application.status && !["PENDING_APPROVAL", "REJECTED", "DRAFT"].includes(application.status)),
    )
  ) {
    return fail("This company is already in certification");
  }

  try {
    for (const product of products) await deleteTradeProduct(session, product.id);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Delete failed", err instanceof ProductRecordError ? err.status : 400);
  }

  await prisma.invitation.deleteMany({ where: { organizationId: id } });
  await prisma.organizationMembership.deleteMany({ where: { organizationId: id } });
  await prisma.userRoleAssignment.deleteMany({ where: { organizationId: id } });
  const accounts = await prisma.clientAccount.findMany({ where: { organizationId: id } });
  for (const account of accounts) {
    await prisma.company.deleteMany({ where: { clientAccountId: account.id } });
  }
  await prisma.clientAccount.deleteMany({ where: { organizationId: id } });
  await prisma.organization.delete({ where: { id } });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "TRADE_COMPANY_DELETE",
    entityType: "Organization",
    entityId: id,
    before: { name: organization.name },
  });
  return NextResponse.json({ ok: true });
}
