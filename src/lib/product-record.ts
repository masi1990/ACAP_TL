import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import type { AuthedSession } from "@/lib/require-auth";
import { extractAssessmentDrafts } from "@/lib/standard-assessment";
import { removeDossierFile } from "@/lib/dossier-files";
import { originClaimFromBody } from "@/lib/origin-claim";
import { assertCbMayGrantMark, requestedClientMark } from "@/lib/cb-licenses";

const TRADE_TYPES = ["MANUFACTURER", "IMPORTER", "CLIENT"];

export class ProductRecordError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function assertCanManageTradeOrg(
  session: AuthedSession,
  organization: { id: string; type: string; servicingCbId: string | null },
) {
  if (!TRADE_TYPES.includes(organization.type)) {
    throw new ProductRecordError("Products belong to a manufacturer or importer");
  }
  if (can(session.user, "cb:write") || can(session.user, "manufacturer:write")) return;
  const member = session.user.memberships.some((membership) => membership.organization.id === organization.id);
  const ownCb = session.user.memberships.find((membership) => membership.organization.type === "CB")?.organization.id;
  if (member || (ownCb && organization.servicingCbId === ownCb)) return;
  throw new ProductRecordError("You can only register products for your own organisation");
}

export async function materializeStandardItems(applicationId: string, machineDocJson: string) {
  const existing = await prisma.assessmentItem.count({ where: { applicationId, source: "STANDARD" } });
  if (existing) return;
  let machine: Parameters<typeof extractAssessmentDrafts>[0] = {};
  try {
    machine = JSON.parse(machineDocJson);
  } catch {
    machine = {};
  }
  const drafts = extractAssessmentDrafts(machine);
  if (!drafts.length) return;
  await prisma.assessmentItem.createMany({
    data: drafts.map((draft) => ({
      applicationId,
      source: "STANDARD",
      kind: draft.kind,
      itemKey: draft.itemKey,
      section: draft.section,
      clause: draft.clause,
      heading: draft.heading,
      text: draft.text,
      testMethod: draft.testMethod,
      sortOrder: draft.sortOrder,
    })),
  });
}

export async function resolveTariffLineId(standardVersionId: string, requested: unknown) {
  const explicit = String(requested ?? "").trim();
  if (explicit) {
    const line = await prisma.tariffLine.findUnique({ where: { id: explicit } });
    if (!line) throw new ProductRecordError("Tariff line not found");
    return line.id;
  }
  const mapped = await prisma.standardTariffMap.findFirst({
    where: { standardVersionId },
    select: { tariffLineId: true },
  });
  return mapped?.tariffLineId ?? null;
}

export async function ensureCompany(
  organization: {
    id: string;
    name: string;
    memberState: { iso2: string } | null;
    clientAccounts: { companies: { id: string }[] }[];
  },
  fallbackCountry: string,
) {
  const existing = organization.clientAccounts.flatMap((account) => account.companies)[0];
  if (existing) return existing.id;
  const account = await prisma.clientAccount.create({
    data: { organizationId: organization.id, displayName: organization.name },
  });
  const company = await prisma.company.create({
    data: {
      clientAccountId: account.id,
      legalName: organization.name,
      countryIso2: organization.memberState?.iso2 || fallbackCountry,
    },
  });
  return company.id;
}

export async function createTradeProduct(input: {
  companyId: string;
  name: string;
  commodity: string;
  standardVersionId: string;
  machineDocJson: string;
  originClaimJson: string;
  tariffLineId: string | null;
  servicingCbId: string | null;
  markScheme?: "QUALITY" | "ECO";
}) {
  const markScheme = input.markScheme || "QUALITY";
  if (input.servicingCbId) {
    try {
      await assertCbMayGrantMark(input.servicingCbId, markScheme);
    } catch (err) {
      throw new ProductRecordError(err instanceof Error ? err.message : "Licence check failed");
    }
  }
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        commodity: input.commodity,
        originClaimJson: input.originClaimJson,
        tariffLineId: input.tariffLineId,
      },
    });
    await tx.productStandardLink.create({
      data: { productId: created.id, standardVersionId: input.standardVersionId },
    });
    await tx.productVariant.create({
      data: {
        productId: created.id,
        sku: `SKU-${created.id.slice(-8).toUpperCase()}`,
        label: input.name,
      },
    });
    if (input.servicingCbId) {
      await tx.certificationApplication.create({
        data: {
          productId: created.id,
          organizationId: input.servicingCbId,
          standardVersionId: input.standardVersionId,
          status: "EVALUATION",
          markScheme,
        },
      });
    }
    return created;
  });

  if (input.servicingCbId) {
    const application = await prisma.certificationApplication.findFirst({
      where: { productId: product.id, standardVersionId: input.standardVersionId },
    });
    if (application) await materializeStandardItems(application.id, input.machineDocJson);
  }
  return product;
}

const productInclude = {
  company: { include: { clientAccount: { include: { organization: true } } } },
  standardLinks: true,
  applications: {
    include: { coc: true, assessmentItems: true, dossierAttachments: true },
  },
  variants: { include: { pin: true } },
} as const;

async function loadManagedProduct(session: AuthedSession, id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw new ProductRecordError("Product not found", 404);
  assertCanManageTradeOrg(session, product.company.clientAccount.organization);
  return product;
}

export async function updateTradeProduct(session: AuthedSession, id: string, body: Record<string, unknown>) {
  const product = await loadManagedProduct(session, id);
  const certified = product.applications.some((application) => application.coc);

  const name = String(body.name || "").trim();
  const commodity = String(body.commodity || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  if (!name || !commodity || !standardVersionId) {
    throw new ProductRecordError("Product, commodity, and standard are required");
  }
  const version = await prisma.standardVersion.findUnique({ where: { id: standardVersionId } });
  if (!version) throw new ProductRecordError("Standard not found");

  const current = product.company.clientAccount.organization;
  const requestedOrgId = String(body.organizationId || "").trim();
  const next =
    requestedOrgId && requestedOrgId !== current.id
      ? await prisma.organization.findUnique({
          where: { id: requestedOrgId },
          include: { memberState: true, clientAccounts: { include: { companies: true } } },
        })
      : null;
  if (requestedOrgId && requestedOrgId !== current.id && !next) {
    throw new ProductRecordError("Manufacturer or importer not found");
  }
  if (next) assertCanManageTradeOrg(session, next);
  const owner = next ?? current;

  const claim = originClaimFromBody(body, { importer: owner.type === "IMPORTER" });
  const tariffLineId = await resolveTariffLineId(standardVersionId, body.tariffLineId);
  const standardChanged = product.standardLinks[0]?.standardVersionId !== standardVersionId;
  if (certified && standardChanged) {
    throw new ProductRecordError("A certified product keeps the standard it was certified against");
  }
  let markScheme: "QUALITY" | "ECO" | null = null;
  if (body.markScheme != null && String(body.markScheme).trim()) {
    try {
      markScheme = requestedClientMark(body.markScheme);
      if (owner.servicingCbId) await assertCbMayGrantMark(owner.servicingCbId, markScheme);
    } catch (err) {
      throw new ProductRecordError(err instanceof Error ? err.message : "Licence check failed");
    }
  }
  const certificateStatus = String(body.certificateStatus || "").trim().toLowerCase();
  if (certificateStatus && !["certified", "expired", "suspended", "withdrawn"].includes(certificateStatus)) {
    throw new ProductRecordError("Choose a certificate status from the list");
  }
  if (standardChanged && product.applications.some((application) => application.assessmentItems.length > 0)) {
    throw new ProductRecordError("The standard cannot change after assessment has started", 409);
  }

  const companyId = next ? await ensureCompany(next, claim.originIso2) : product.companyId;

  let applicationId = product.applications[0]?.id || "";
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: {
        companyId,
        name,
        commodity,
        tariffLineId,
        originClaimJson: JSON.stringify(claim),
      },
    });
    await tx.productVariant.updateMany({ where: { productId: product.id }, data: { label: name } });
    if (product.standardLinks[0]) {
      await tx.productStandardLink.update({
        where: { id: product.standardLinks[0].id },
        data: { standardVersionId },
      });
    } else {
      await tx.productStandardLink.create({ data: { productId: product.id, standardVersionId } });
    }
    for (const application of product.applications) {
      await tx.certificationApplication.update({
        where: { id: application.id },
        data: {
          standardVersionId,
          ...(markScheme ? { markScheme } : {}),
          ...(owner.servicingCbId ? { organizationId: owner.servicingCbId } : {}),
        },
      });
      if (application.coc && (certificateStatus || markScheme)) {
        await tx.coC.update({
          where: { id: application.coc.id },
          data: {
            ...(certificateStatus ? { status: certificateStatus } : {}),
            ...(markScheme ? { markScheme } : {}),
          },
        });
        if (certificateStatus) {
          await tx.productPin.updateMany({
            where: { cocId: application.coc.id },
            data: { status: certificateStatus },
          });
          await tx.markGrant.updateMany({
            where: { cocId: application.coc.id },
            data: { status: certificateStatus === "certified" ? "ACTIVE" : certificateStatus.toUpperCase() },
          });
        }
      }
    }
    if (!applicationId && owner.servicingCbId) {
      const created = await tx.certificationApplication.create({
        data: {
          productId: product.id,
          organizationId: owner.servicingCbId,
          standardVersionId,
          status: "EVALUATION",
          markScheme: markScheme || "QUALITY",
        },
      });
      applicationId = created.id;
    }
  });

  if (applicationId && (standardChanged || product.applications.length === 0)) {
    await materializeStandardItems(applicationId, version.machineDocJson);
  }
  return product.id;
}

export async function deleteTradeProduct(session: AuthedSession, id: string) {
  const product = await loadManagedProduct(session, id);

  for (const application of product.applications) {
    for (const file of application.dossierAttachments) {
      await removeDossierFile(file.storageUri);
    }
  }

  const applicationIds = product.applications.map((application) => application.id);
  const cocIds = product.applications.flatMap((application) => (application.coc ? [application.coc.id] : []));
  const pinIds = product.variants.flatMap((variant) => (variant.pin ? [variant.pin.id] : []));
  await prisma.$transaction(async (tx) => {
    if (pinIds.length) {
      await tx.fraudAlert.deleteMany({ where: { pinId: { in: pinIds } } });
      await tx.consumerComplaint.deleteMany({ where: { pinId: { in: pinIds } } });
      const cases = await tx.surveillanceCase.findMany({ where: { pinId: { in: pinIds } }, select: { id: true } });
      if (cases.length) {
        await tx.sanction.deleteMany({ where: { caseId: { in: cases.map((item) => item.id) } } });
      }
      await tx.surveillanceCase.deleteMany({ where: { pinId: { in: pinIds } } });
      await tx.productPin.deleteMany({ where: { id: { in: pinIds } } });
    }
    if (cocIds.length) {
      await tx.notificationJob.deleteMany({ where: { cocId: { in: cocIds } } });
      await tx.feeEvent.deleteMany({ where: { cocId: { in: cocIds } } });
      await tx.ledgerAnchor.deleteMany({ where: { cocId: { in: cocIds } } });
      await tx.markGrant.deleteMany({ where: { cocId: { in: cocIds } } });
      await tx.customsClearance.deleteMany({ where: { cocId: { in: cocIds } } });
      await tx.coC.deleteMany({ where: { id: { in: cocIds } } });
    }
    if (applicationIds.length) {
      await tx.labResult.deleteMany({ where: { applicationId: { in: applicationIds } } });
      await tx.attachment.deleteMany({ where: { applicationId: { in: applicationIds } } });
      await tx.certificationApplication.deleteMany({ where: { id: { in: applicationIds } } });
    }
    await tx.conformityInspection.deleteMany({ where: { productId: product.id } });
    await tx.customsClearance.deleteMany({ where: { productId: product.id } });
    await tx.productVariant.deleteMany({ where: { productId: product.id } });
    await tx.productStandardLink.deleteMany({ where: { productId: product.id } });
    await tx.product.delete({ where: { id: product.id } });
  });
}
