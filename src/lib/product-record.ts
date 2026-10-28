import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { productAssignedToBodies } from "@/lib/cb-scope";
import { certificationBodyIds, hasGlobalPermission } from "@/lib/rbac";
import type { AuthedSession } from "@/lib/require-auth";
import { extractAssessmentDrafts } from "@/lib/standard-assessment";
import { removeDossierFile } from "@/lib/dossier-files";
import { originClaimFromBody } from "@/lib/origin-claim";
import { assertCbMayGrantMark, coverageFromBody } from "@/lib/cb-licenses";

const TRADE_TYPES = ["MANUFACTURER", "IMPORTER", "CLIENT"];

export function submittedApplicationStatus(
  session: AuthedSession,
  certifyingCbId: string,
): "EVALUATION" | "PENDING_APPROVAL" {
  if (hasGlobalPermission(session.user, "cb:write")) return "EVALUATION";
  if (certificationBodyIds(session.user).includes(certifyingCbId)) return "EVALUATION";
  return "PENDING_APPROVAL";
}

export function assertApplicationAcceptsWork(status: string) {
  if (status === "PENDING_APPROVAL") {
    throw new ProductRecordError("The certification body has not accepted this product yet");
  }
  if (status === "REJECTED" || status === "WITHDRAWN") {
    throw new ProductRecordError("This product is not in certification");
  }
}

function assertClientCanReceiveProduct(status: string, applicationStatus: string) {
  if (status === "REJECTED") throw new ProductRecordError("This company was rejected");
  if (status === "SUSPENDED") throw new ProductRecordError("This company is suspended");
  if (status === "PENDING" && applicationStatus === "EVALUATION") {
    throw new ProductRecordError("Accept the company before adding a product for it");
  }
}

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
  if (hasGlobalPermission(session.user, "cb:write") || hasGlobalPermission(session.user, "manufacturer:write")) {
    return;
  }
  const member = session.user.memberships.some((membership) => membership.organization.id === organization.id);
  const serves =
    organization.servicingCbId != null &&
    certificationBodyIds(session.user).includes(organization.servicingCbId);
  if (member || serves) return;
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

export async function ecoTrackFromBody(body: Record<string, unknown>) {
  try {
    const parsed = coverageFromBody(body);
    if (parsed.coverage !== "BOTH") {
      return { coverage: "QUALITY" as const, ecoStandardVersionId: null as string | null, ecoMachineDocJson: null as string | null };
    }
    const eco = await prisma.standardVersion.findUnique({ where: { id: parsed.ecoStandardVersionId } });
    if (!eco) throw new ProductRecordError("Eco standard not found");
    return {
      coverage: "BOTH" as const,
      ecoStandardVersionId: eco.id,
      ecoMachineDocJson: eco.machineDocJson,
    };
  } catch (err) {
    if (err instanceof ProductRecordError) throw err;
    throw new ProductRecordError(err instanceof Error ? err.message : "Choose the marks for this product");
  }
}

export async function resolveCertifyingCb(requested: unknown, fallback: string | null) {
  const id = String(requested ?? "").trim() || fallback || "";
  if (!id) throw new ProductRecordError("Choose the certification body for this product");
  const body = await prisma.organization.findUnique({ where: { id } });
  if (!body || body.type !== "CB" || body.status === "SUSPENDED") {
    throw new ProductRecordError("Choose an active certification body");
  }
  return body.id;
}

type MarkTrack = {
  markScheme: "QUALITY" | "ECO";
  standardVersionId: string;
  machineDocJson: string;
};

export async function createTradeProduct(input: {
  companyId: string;
  name: string;
  commodity: string;
  standardVersionId: string;
  machineDocJson: string;
  originClaimJson: string;
  tariffLineId: string | null;
  servicingCbId: string | null;
  coverage?: "QUALITY" | "BOTH";
  ecoStandardVersionId?: string | null;
  ecoMachineDocJson?: string | null;
  applicationStatus?: "EVALUATION" | "PENDING_APPROVAL";
}) {
  const coverage = input.coverage || "QUALITY";
  const applicationStatus = input.applicationStatus || "EVALUATION";
  const tracks: MarkTrack[] = [
    {
      markScheme: "QUALITY",
      standardVersionId: input.standardVersionId,
      machineDocJson: input.machineDocJson,
    },
  ];
  if (coverage === "BOTH") {
    const ecoStandardVersionId = String(input.ecoStandardVersionId || "").trim();
    if (!ecoStandardVersionId) throw new ProductRecordError("Choose the standard for Eco Mark Africa.");
    tracks.push({
      markScheme: "ECO",
      standardVersionId: ecoStandardVersionId,
      machineDocJson: input.ecoMachineDocJson || "{}",
    });
  }
  const chosen = await prisma.standardVersion.findMany({
    where: { id: { in: tracks.map((track) => track.standardVersionId) } },
    include: { standard: { select: { kind: true, designation: true } } },
  });
  for (const track of tracks) {
    const version = chosen.find((row) => row.id === track.standardVersionId);
    if (!version) throw new ProductRecordError("Standard not found");
    if (version.standard.kind !== "PRODUCT") {
      throw new ProductRecordError(
        `${version.standard.designation} is not a product standard. Only product standards are used for product certification.`,
      );
    }
  }
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: { clientAccount: { include: { organization: true } } },
  });
  if (!company) throw new ProductRecordError("This client has no company record");
  assertClientCanReceiveProduct(company.clientAccount.organization.status, applicationStatus);
  if (input.servicingCbId) {
    try {
      for (const track of tracks) {
        await assertCbMayGrantMark(input.servicingCbId, track.markScheme);
      }
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
        certifyingCbId: input.servicingCbId,
      },
    });
    for (const track of tracks) {
      await tx.productStandardLink.create({
        data: {
          productId: created.id,
          markScheme: track.markScheme,
          standardVersionId: track.standardVersionId,
        },
      });
    }
    await tx.productVariant.create({
      data: {
        productId: created.id,
        sku: `SKU-${created.id.slice(-8).toUpperCase()}`,
        label: input.name,
      },
    });
    if (input.servicingCbId) {
      for (const track of tracks) {
        await tx.certificationApplication.create({
          data: {
            productId: created.id,
            organizationId: input.servicingCbId,
            standardVersionId: track.standardVersionId,
            status: applicationStatus,
            markScheme: track.markScheme,
          },
        });
      }
    }
    return created;
  });

  if (input.servicingCbId) {
    const applications = await prisma.certificationApplication.findMany({
      where: { productId: product.id },
    });
    for (const application of applications) {
      const track = tracks.find((row) => row.markScheme === application.markScheme);
      if (track) await materializeStandardItems(application.id, track.machineDocJson);
    }
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
  if (!productAssignedToBodies(product, certificationBodyIds(session.user))) {
    assertCanManageTradeOrg(session, product.company.clientAccount.organization);
  }
  return product;
}

const CERTIFICATE_STATUSES = ["certified", "expired", "suspended", "withdrawn"];

function certificateStatusOrNull(raw: unknown) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (!CERTIFICATE_STATUSES.includes(value)) {
    throw new ProductRecordError("Choose a certificate status from the list");
  }
  return value;
}

export async function updateTradeProduct(session: AuthedSession, id: string, body: Record<string, unknown>) {
  const product = await loadManagedProduct(session, id);
  const qualityApp = product.applications.find((application) => application.markScheme === "QUALITY") || null;
  const ecoApp = product.applications.find((application) => application.markScheme === "ECO") || null;
  const anyCertified = product.applications.some((application) => application.coc);

  const name = String(body.name || "").trim();
  const commodity = String(body.commodity || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  if (!name || !commodity || !standardVersionId) {
    throw new ProductRecordError("Product, commodity, and the Quality standard are required");
  }
  let coverage: "QUALITY" | "BOTH" = ecoApp ? "BOTH" : "QUALITY";
  let ecoStandardVersionId = "";
  if (body.markCoverage != null || body.markScheme != null || body.ecoStandardVersionId != null) {
    try {
      const parsed = coverageFromBody({
        ...body,
        markCoverage: body.markCoverage ?? body.markScheme ?? coverage,
        ecoStandardVersionId:
          body.ecoStandardVersionId ??
          product.standardLinks.find((link) => link.markScheme === "ECO")?.standardVersionId ??
          "",
      });
      coverage = parsed.coverage;
      ecoStandardVersionId = parsed.ecoStandardVersionId;
    } catch (err) {
      throw new ProductRecordError(err instanceof Error ? err.message : "Choose the marks for this product");
    }
  } else if (ecoApp) {
    ecoStandardVersionId = ecoApp.standardVersionId;
  }

  const versionIds = [standardVersionId, ...(coverage === "BOTH" ? [ecoStandardVersionId] : [])];
  const versions = await prisma.standardVersion.findMany({
    where: { id: { in: versionIds } },
    include: { standard: { select: { kind: true, designation: true } } },
  });
  const qualityVersion = versions.find((version) => version.id === standardVersionId);
  const ecoVersion = versions.find((version) => version.id === ecoStandardVersionId);
  if (!qualityVersion) throw new ProductRecordError("Quality standard not found");
  if (coverage === "BOTH" && !ecoVersion) throw new ProductRecordError("Eco standard not found");

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
  const qualityLink = product.standardLinks.find((link) => link.markScheme === "QUALITY") || null;
  const ecoLink = product.standardLinks.find((link) => link.markScheme === "ECO");
  const qualityStandardChanged = (qualityLink?.standardVersionId || qualityApp?.standardVersionId) !== standardVersionId;
  const ecoStandardChanged = coverage === "BOTH" && (ecoLink?.standardVersionId || ecoApp?.standardVersionId) !== ecoStandardVersionId;
  if (qualityStandardChanged && qualityVersion.standard.kind !== "PRODUCT") {
    throw new ProductRecordError(
      `${qualityVersion.standard.designation} is not a product standard. Only product standards are used for product certification.`,
    );
  }
  if (ecoStandardChanged && ecoVersion && ecoVersion.standard.kind !== "PRODUCT") {
    throw new ProductRecordError(
      `${ecoVersion.standard.designation} is not a product standard. Only product standards are used for product certification.`,
    );
  }
  if (qualityApp?.coc && qualityStandardChanged) {
    throw new ProductRecordError("The Quality Mark keeps the standard its certificate was issued against");
  }
  if (ecoApp?.coc && (coverage !== "BOTH" || ecoStandardChanged)) {
    throw new ProductRecordError("The Eco Mark keeps the standard its certificate was issued against");
  }
  if (qualityStandardChanged && (qualityApp?.assessmentItems.length || 0) > 0) {
    throw new ProductRecordError("The Quality standard cannot change after its assessment has started", 409);
  }
  if (ecoStandardChanged && (ecoApp?.assessmentItems.length || 0) > 0) {
    throw new ProductRecordError("The Eco standard cannot change after its assessment has started", 409);
  }
  if (coverage === "QUALITY" && ecoApp && ecoApp.assessmentItems.length > 0) {
    throw new ProductRecordError("The Eco assessment has started, so Eco Mark Africa stays on this product", 409);
  }

  const requestedCb = String(body.certifyingCbId || "").trim();
  const certifyingCbId = requestedCb
    ? await resolveCertifyingCb(requestedCb, null)
    : product.certifyingCbId || owner.servicingCbId;
  if (anyCertified && certifyingCbId && product.certifyingCbId && certifyingCbId !== product.certifyingCbId) {
    throw new ProductRecordError("A certified product keeps the certification body that issued the certificate");
  }
  if (certifyingCbId) {
    try {
      await assertCbMayGrantMark(certifyingCbId, "QUALITY");
      if (coverage === "BOTH") await assertCbMayGrantMark(certifyingCbId, "ECO");
    } catch (err) {
      throw new ProductRecordError(err instanceof Error ? err.message : "Licence check failed");
    }
  }

  const qualityStatus = qualityApp?.coc ? certificateStatusOrNull(body.certificateStatus) : null;
  const ecoStatus =
    certificateStatusOrNull(body.ecoCertificateStatus) ||
    (!qualityApp?.coc && ecoApp?.coc ? certificateStatusOrNull(body.certificateStatus) : null);
  const companyId = next ? await ensureCompany(next, claim.originIso2) : product.companyId;
  const fresh: { id: string; machineDocJson: string }[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: {
        companyId,
        name,
        commodity,
        tariffLineId,
        originClaimJson: JSON.stringify(claim),
        ...(certifyingCbId ? { certifyingCbId } : {}),
      },
    });
    await tx.productVariant.updateMany({ where: { productId: product.id }, data: { label: name } });

    if (qualityLink) {
      await tx.productStandardLink.update({
        where: { id: qualityLink.id },
        data: { markScheme: "QUALITY", standardVersionId },
      });
    } else {
      await tx.productStandardLink.create({
        data: { productId: product.id, markScheme: "QUALITY", standardVersionId },
      });
    }

    const statusForNew = certifyingCbId ? submittedApplicationStatus(session, certifyingCbId) : "EVALUATION";
    if (qualityApp) {
      await tx.certificationApplication.update({
        where: { id: qualityApp.id },
        data: {
          standardVersionId,
          markScheme: "QUALITY",
          ...(certifyingCbId && !qualityApp.coc ? { organizationId: certifyingCbId } : {}),
        },
      });
    } else if (certifyingCbId) {
      const created = await tx.certificationApplication.create({
        data: {
          productId: product.id,
          organizationId: certifyingCbId,
          standardVersionId,
          status: statusForNew,
          markScheme: "QUALITY",
        },
      });
      fresh.push({ id: created.id, machineDocJson: qualityVersion.machineDocJson });
    }
    if (qualityStandardChanged && qualityApp) {
      fresh.push({ id: qualityApp.id, machineDocJson: qualityVersion.machineDocJson });
    }

    if (coverage === "BOTH" && ecoVersion) {
      if (ecoLink) {
        await tx.productStandardLink.update({
          where: { id: ecoLink.id },
          data: { standardVersionId: ecoStandardVersionId },
        });
      } else {
        await tx.productStandardLink.create({
          data: { productId: product.id, markScheme: "ECO", standardVersionId: ecoStandardVersionId },
        });
      }
      if (ecoApp) {
        await tx.certificationApplication.update({
          where: { id: ecoApp.id },
          data: {
            standardVersionId: ecoStandardVersionId,
            ...(certifyingCbId && !ecoApp.coc ? { organizationId: certifyingCbId } : {}),
          },
        });
        if (ecoStandardChanged) fresh.push({ id: ecoApp.id, machineDocJson: ecoVersion.machineDocJson });
      } else if (certifyingCbId) {
        const created = await tx.certificationApplication.create({
          data: {
            productId: product.id,
            organizationId: certifyingCbId,
            standardVersionId: ecoStandardVersionId,
            status: statusForNew,
            markScheme: "ECO",
          },
        });
        fresh.push({ id: created.id, machineDocJson: ecoVersion.machineDocJson });
      }
    } else if (ecoApp && !ecoApp.coc) {
      await tx.labResult.deleteMany({ where: { applicationId: ecoApp.id } });
      await tx.attachment.deleteMany({ where: { applicationId: ecoApp.id } });
      await tx.certificationApplication.delete({ where: { id: ecoApp.id } });
      if (ecoLink) await tx.productStandardLink.delete({ where: { id: ecoLink.id } });
    }

    await applyCertificateStatus(tx, qualityApp?.coc, qualityStatus);
    await applyCertificateStatus(tx, ecoApp?.coc, ecoStatus);
  });

  for (const row of fresh) {
    await materializeStandardItems(row.id, row.machineDocJson);
  }
  return product.id;
}

async function applyCertificateStatus(
  tx: Prisma.TransactionClient,
  coc: { id: string } | null | undefined,
  status: string | null,
) {
  if (!coc || !status) return;
  await tx.coC.update({ where: { id: coc.id }, data: { status } });
  await tx.productPin.updateMany({ where: { cocId: coc.id }, data: { status } });
  await tx.markGrant.updateMany({
    where: { cocId: coc.id },
    data: { status: status === "certified" ? "ACTIVE" : status.toUpperCase() },
  });
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
