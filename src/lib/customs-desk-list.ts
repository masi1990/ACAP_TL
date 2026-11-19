import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { customsDeskProduct } from "@/lib/customs-desk";
import { withDecisionActors } from "@/lib/line-actor";
import { listPage } from "@/lib/list-page";
import { normalizeListQuery } from "@/lib/list-query";

export type CustomsDeskSearchParams = { q?: string; page?: string; product?: string };

const include = {
  company: { include: { clientAccount: { include: { organization: true } } } },
  standardLinks: { include: { standardVersion: { include: { standard: true } } } },
  applications: {
    orderBy: { createdAt: "desc" },
    include: {
      organization: true,
      recordedBy: { select: { name: true, email: true } },
      coc: true,
      standardVersion: { include: { standard: true } },
      testDossier: true,
      assessmentItems: {
        include: { evidence: true, recordedBy: { select: { name: true, email: true } } },
        orderBy: { sortOrder: "asc" },
      },
      dossierAttachments: { orderBy: { uploadedAt: "asc" } },
    },
  },
  inspections: { orderBy: { inspectedAt: "desc" } },
  clearances: { orderBy: { decidedAt: "desc" } },
} satisfies Prisma.ProductInclude;

/**
 * One page of products for the customs and inspection desks. The product the officer already picked
 * (`product`) is always included, even when it sits on another page or outside the search.
 */
export async function loadCustomsDeskPage(sp: CustomsDeskSearchParams) {
  const q = normalizeListQuery(sp.q);
  const where: Prisma.ProductWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { commodity: { contains: q, mode: "insensitive" } },
          { company: { clientAccount: { organization: { name: { contains: q, mode: "insensitive" } } } } },
        ],
      }
    : {};
  const total = await prisma.product.count({ where });
  const listing = listPage(sp.page, total);
  const rows = await prisma.product.findMany({
    where,
    include,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: listing.skip,
    take: listing.take,
  });

  const selectedId = sp.product?.trim() || "";
  if (selectedId && !rows.some((row) => row.id === selectedId)) {
    const picked = await prisma.product.findUnique({ where: { id: selectedId }, include });
    if (picked) rows.unshift(picked);
  }

  const withActors = await withDecisionActors(rows);
  return {
    q,
    listing,
    selectedId,
    /** False only when there are no products at all; a search with no match still shows the desk. */
    anyProducts: total > 0 || Boolean(q),
    products: withActors.map(customsDeskProduct),
  };
}
