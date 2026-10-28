import { prisma } from "@/lib/db";
import type { AuthedSession } from "@/lib/require-auth";

function organizationIds(session: AuthedSession) {
  return session.user.memberships.map((membership) => membership.organization.id);
}

export async function memberOwnsProduct(session: AuthedSession, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { company: { select: { clientAccount: { select: { organizationId: true } } } } },
  });
  const organizationId = product?.company.clientAccount.organizationId;
  return organizationId != null && organizationIds(session).includes(organizationId);
}

export async function memberMayViewStandard(session: AuthedSession, standardId: string) {
  const orgIds = organizationIds(session);
  if (!orgIds.length) return false;
  const link = await prisma.productStandardLink.findFirst({
    where: {
      standardVersion: { standardId },
      product: { company: { clientAccount: { organizationId: { in: orgIds } } } },
    },
    select: { id: true },
  });
  return Boolean(link);
}

export async function memberMayViewFile(session: AuthedSession, kind: string, id: string) {
  const orgIds = organizationIds(session);
  if (!orgIds.length) return false;
  if (kind === "dossier") {
    const row = await prisma.dossierAttachment.findUnique({
      where: { id },
      select: {
        application: {
          select: {
            product: { select: { company: { select: { clientAccount: { select: { organizationId: true } } } } } },
          },
        },
      },
    });
    const organizationId = row?.application.product.company.clientAccount.organizationId;
    return organizationId != null && orgIds.includes(organizationId);
  }
  if (kind === "evidence") {
    const row = await prisma.labEvidence.findUnique({
      where: { id },
      select: {
        assessmentItem: {
          select: {
            application: {
              select: {
                product: {
                  select: { company: { select: { clientAccount: { select: { organizationId: true } } } } },
                },
              },
            },
          },
        },
      },
    });
    const organizationId = row?.assessmentItem.application.product.company.clientAccount.organizationId;
    return organizationId != null && orgIds.includes(organizationId);
  }
  return false;
}
