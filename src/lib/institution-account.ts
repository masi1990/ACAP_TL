import { prisma } from "@/lib/db";
import { isAuthorityType } from "@/lib/rbac";
import { saveCbMarkLicences } from "@/lib/cb-licenses";
import { replaceOrgRole } from "@/lib/org-accounts";

/** Create a public authority and make an existing user its organisation admin. */
export async function createAuthorityAccount(input: {
  name: string;
  type: string;
  memberStateId: string;
  adminUserId: string;
  grantedById: string;
  alsoCertifies?: boolean;
}) {
  const type = input.type.toUpperCase();
  if (!isAuthorityType(type)) throw new Error("Choose an institution type");
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const state = await prisma.memberState.findUnique({ where: { id: input.memberStateId } });
  if (!state) throw new Error("Choose a country");

  const org = await prisma.organization.create({
    data: {
      name,
      type,
      memberStateId: state.id,
      backing: "GOVERNMENT",
      alsoCertifies: type === "NSB" && input.alsoCertifies === true,
      primaryAdminId: input.adminUserId,
      status: "ACTIVE",
    },
  });

  if (type === "CB") {
    const licence = await saveCbMarkLicences(org.id, {
      clientMarks: "QUALITY",
      licenseStatus: "APPROVED",
    });
    if (licence.error) {
      await prisma.organization.delete({ where: { id: org.id } });
      throw new Error(licence.error);
    }
  }

  await replaceOrgRole({
    userId: input.adminUserId,
    organizationId: org.id,
    roleCode: "PRIMARY_ADMIN",
    grantedById: input.grantedById,
  });
  return org;
}
