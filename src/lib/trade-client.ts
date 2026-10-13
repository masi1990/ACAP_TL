import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import type { AuthedSession } from "@/lib/require-auth";
import { isCountryCode } from "@/lib/countries";
import { deleteTradeProduct, ProductRecordError } from "@/lib/product-record";

const TRADE = ["MANUFACTURER", "IMPORTER"];

export function assertCanManageClient(
  session: AuthedSession,
  organization: { id: string; type: string; servicingCbId: string | null },
) {
  if (!TRADE.includes(organization.type)) {
    throw new ProductRecordError("Choose a manufacturer or importer");
  }
  if (can(session.user, "cb:write")) return;
  const ownCb = session.user.memberships.find((membership) => membership.organization.type === "CB")?.organization.id;
  if (ownCb && organization.servicingCbId === ownCb) return;
  throw new ProductRecordError("You can only change clients of your certification body", 403);
}

export async function updateTradeClient(session: AuthedSession, id: string, body: Record<string, unknown>) {
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: { clientAccounts: { include: { companies: true } } },
  });
  if (!organization) throw new ProductRecordError("Manufacturer or importer not found", 404);
  assertCanManageClient(session, organization);

  const name = String(body.name || "").trim();
  const type = String(body.type || organization.type).toUpperCase();
  const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
  if (!name) throw new ProductRecordError("Name is required");
  if (!TRADE.includes(type)) throw new ProductRecordError("Choose a manufacturer or an importer");
  if (!isCountryCode(countryIso2)) throw new ProductRecordError("Choose a country");

  let servicingCbId = organization.servicingCbId;
  if (can(session.user, "cb:write") && body.cbOrganizationId != null) {
    const cbId = String(body.cbOrganizationId || "").trim();
    const cb = cbId ? await prisma.organization.findFirst({ where: { id: cbId, type: "CB" } }) : null;
    if (!cb) throw new ProductRecordError("Choose the certification body that serves this client");
    servicingCbId = cb.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id },
      data: { name, type, servicingCbId },
    });
    const companies = organization.clientAccounts.flatMap((account) => account.companies);
    if (companies.length === 0) {
      const account = await tx.clientAccount.create({
        data: { organizationId: id, displayName: name },
      });
      await tx.company.create({
        data: { clientAccountId: account.id, legalName: name, countryIso2 },
      });
    } else {
      for (const company of companies) {
        await tx.company.update({
          where: { id: company.id },
          data: { legalName: name, countryIso2 },
        });
      }
      await tx.clientAccount.updateMany({
        where: { organizationId: id },
        data: { displayName: name },
      });
    }
    if (servicingCbId && servicingCbId !== organization.servicingCbId) {
      const products = await tx.product.findMany({
        where: { company: { clientAccount: { organizationId: id } } },
        select: { id: true },
      });
      if (products.length) {
        await tx.certificationApplication.updateMany({
          where: { productId: { in: products.map((product) => product.id) }, coc: { is: null } },
          data: { organizationId: servicingCbId },
        });
      }
    }
  });
}

export async function deleteTradeClient(session: AuthedSession, id: string) {
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      clientAccounts: {
        include: { companies: { include: { products: { include: { applications: { include: { coc: true } } } } } } },
      },
    },
  });
  if (!organization) throw new ProductRecordError("Manufacturer or importer not found", 404);
  assertCanManageClient(session, organization);

  const products = organization.clientAccounts.flatMap((account) =>
    account.companies.flatMap((company) => company.products),
  );
  if (products.some((product) => product.applications.some((application) => application.coc))) {
    throw new ProductRecordError("A client with a certified product cannot be deleted", 409);
  }
  for (const product of products) {
    await deleteTradeProduct(session, product.id);
  }

  await prisma.organizationMembership.deleteMany({ where: { organizationId: id } });
  const accounts = await prisma.clientAccount.findMany({ where: { organizationId: id } });
  for (const account of accounts) {
    await prisma.company.deleteMany({ where: { clientAccountId: account.id } });
  }
  await prisma.clientAccount.deleteMany({ where: { organizationId: id } });
  await prisma.organization.delete({ where: { id } });
}
