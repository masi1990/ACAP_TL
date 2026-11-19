import { prisma } from "@/lib/db";

export type ComplaintTarget = {
  registryKey: string;
  productId: string | null;
  pinId: string | null;
  pinCode: string | null;
  routedCbId: string;
  brand: string;
  manufacturer: string;
  cbName: string;
};

export class ComplaintTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplaintTargetError";
  }
}

/**
 * Resolve a confirmed certified-product selection to routing fields.
 * Accepts hub product ids or registry keys `live-{liveProductId}`.
 */
export async function resolveComplaintTarget(input: {
  registryKey?: string | null;
  productId?: string | null;
  pinCode?: string | null;
}): Promise<ComplaintTarget> {
  const registryKey = String(input.registryKey || input.productId || "").trim();
  const pinCodeHint = String(input.pinCode || "").trim();

  if (!registryKey && !pinCodeHint) {
    throw new ComplaintTargetError("Confirm a certified product before submitting");
  }

  if (registryKey.startsWith("live-")) {
    return resolveLiveProduct(registryKey.slice("live-".length), pinCodeHint);
  }

  if (registryKey) {
    const hub = await resolveHubProduct(registryKey);
    if (hub) return hub;
  }

  if (pinCodeHint) {
    const byPin = await resolveByPin(pinCodeHint);
    if (byPin) return byPin;
    throw new ComplaintTargetError("PIN not found among certified products");
  }

  throw new ComplaintTargetError("Certified product not found");
}

async function resolveHubProduct(productId: string): Promise<ComplaintTarget | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      company: true,
      certifyingCb: true,
      applications: {
        where: { coc: { isNot: null } },
        include: {
          organization: true,
          coc: { include: { pins: { take: 1, orderBy: { issuedAt: "desc" } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!product) return null;

  const app = product.applications[0];
  const routedCbId = product.certifyingCbId || app?.organizationId || null;
  if (!routedCbId) {
    throw new ComplaintTargetError("This product has no certifying certification body");
  }

  const pin = app?.coc?.pins[0] ?? null;
  const cbName = product.certifyingCb?.name || app?.organization.name || "Certification body";

  return {
    registryKey: product.id,
    productId: product.id,
    pinId: pin?.id ?? null,
    pinCode: pin?.pinCode ?? null,
    routedCbId,
    brand: product.name,
    manufacturer: product.company.legalName,
    cbName,
  };
}

async function resolveLiveProduct(liveProductId: string, pinCodeHint: string): Promise<ComplaintTarget> {
  const marks = await prisma.importedCertifiedMark.findMany({
    where: { liveProductId },
    include: { certificationBodyOrg: true },
    orderBy: { importedAt: "desc" },
  });
  if (marks.length === 0) {
    throw new ComplaintTargetError("Certified product not found");
  }

  const primary =
    (pinCodeHint ? marks.find((m) => m.pinText === pinCodeHint) : null) || marks[0];

  let routedCbId = primary.certificationBodyOrgId;
  if (!routedCbId && primary.cbName.trim()) {
    const org = await prisma.organization.findFirst({
      where: { type: "CB", name: { equals: primary.cbName.trim(), mode: "insensitive" } },
      select: { id: true, name: true },
    });
    routedCbId = org?.id ?? null;
  }
  if (!routedCbId) {
    throw new ComplaintTargetError("This product has no certifying certification body on record");
  }

  const pin = await prisma.productPin.findUnique({ where: { pinCode: primary.pinText } });

  return {
    registryKey: `live-${liveProductId}`,
    productId: null,
    pinId: pin?.id ?? null,
    pinCode: primary.pinText,
    routedCbId,
    brand: primary.brand.trim() || primary.productName,
    manufacturer: primary.companyName || "—",
    cbName: primary.certificationBodyOrg?.name || primary.cbName || "Certification body",
  };
}

async function resolveByPin(pinCode: string): Promise<ComplaintTarget | null> {
  const pin = await prisma.productPin.findUnique({
    where: { pinCode },
    include: {
      coc: {
        include: {
          application: {
            include: {
              organization: true,
              product: { include: { company: true, certifyingCb: true } },
            },
          },
        },
      },
    },
  });
  if (pin?.coc?.application) {
    const product = pin.coc.application.product;
    const routedCbId = product.certifyingCbId || pin.coc.application.organizationId;
    if (!routedCbId) return null;
    return {
      registryKey: product.id,
      productId: product.id,
      pinId: pin.id,
      pinCode: pin.pinCode,
      routedCbId,
      brand: product.name,
      manufacturer: product.company.legalName,
      cbName: product.certifyingCb?.name || pin.coc.application.organization.name,
    };
  }

  const imported = await prisma.importedCertifiedMark.findFirst({
    where: { pinText: pinCode },
    include: { certificationBodyOrg: true },
  });
  if (!imported) return null;
  return resolveLiveProduct(imported.liveProductId, pinCode);
}
