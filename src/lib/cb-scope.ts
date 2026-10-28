import type { Prisma } from "@prisma/client";

type AssignedProduct = {
  certifyingCbId: string | null;
  applications?: { organizationId: string }[];
};

/** A product belongs to a certification body when that body was chosen for the product. */
export function productAssignedToBodies(product: AssignedProduct, cbIds: string[]) {
  if (!cbIds.length) return false;
  if (product.certifyingCbId && cbIds.includes(product.certifyingCbId)) return true;
  return Boolean(product.applications?.some((row) => cbIds.includes(row.organizationId)));
}

export function visibleClientProducts<T extends AssignedProduct>(
  products: T[],
  cbIds: string[],
  servicingCbId: string | null,
  hub: boolean,
) {
  if (hub) return products;
  return products.filter((product) => {
    if (productAssignedToBodies(product, cbIds)) return true;
    const unassigned = !product.certifyingCbId && !(product.applications && product.applications.length);
    return unassigned && servicingCbId != null && cbIds.includes(servicingCbId);
  });
}

export function certificationDeskProductWhere(cbIds: string[]): Prisma.ProductWhereInput {
  if (!cbIds.length) return { id: { in: [] } };
  return {
    OR: [
      { certifyingCbId: { in: cbIds } },
      { applications: { some: { organizationId: { in: cbIds } } } },
      {
        certifyingCbId: null,
        applications: { none: {} },
        company: { clientAccount: { organization: { servicingCbId: { in: cbIds } } } },
      },
    ],
  };
}

export function certificationDeskClientWhere(cbIds: string[]): Prisma.OrganizationWhereInput {
  if (!cbIds.length) return { id: { in: [] } };
  return {
    type: { in: ["MANUFACTURER", "IMPORTER"] },
    OR: [
      { servicingCbId: { in: cbIds } },
      {
        clientAccounts: {
          some: {
            companies: {
              some: { products: { some: certificationDeskProductWhere(cbIds) } },
            },
          },
        },
      },
    ],
  };
}
