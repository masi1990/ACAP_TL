import { prisma } from "@/lib/db";

export type InstitutionShape = {
  backing: "GOVERNMENT" | "PRIVATE";
  alsoCertifies: boolean;
  memberStateId: string | null;
  operatingCountryIds: string[];
};

/** Government bodies keep one home country. A private certification body lists every country it operates in. */
export async function resolveInstitutionShape(input: {
  type: string;
  backing?: unknown;
  alsoCertifies?: unknown;
  memberStateId?: string | null;
  operatingCountryIds?: unknown;
  requireCountry?: boolean;
}): Promise<{ error: string | null; shape: InstitutionShape }> {
  const type = input.type.toUpperCase();
  const requestedBacking = String(input.backing || "GOVERNMENT").toUpperCase();
  const backing: "GOVERNMENT" | "PRIVATE" =
    type === "CB" && requestedBacking === "PRIVATE" ? "PRIVATE" : "GOVERNMENT";
  if (type !== "CB" && requestedBacking === "PRIVATE") {
    return {
      error: "Only a certification body can be private",
      shape: { backing: "GOVERNMENT", alsoCertifies: false, memberStateId: null, operatingCountryIds: [] },
    };
  }
  const alsoCertifies = type === "NSB" && (input.alsoCertifies === true || input.alsoCertifies === "true");
  if (type === "CB" && (input.alsoCertifies === true || input.alsoCertifies === "true")) {
    return {
      error: "A certification body cannot be a national standards body",
      shape: { backing, alsoCertifies: false, memberStateId: null, operatingCountryIds: [] },
    };
  }

  const ids = Array.isArray(input.operatingCountryIds)
    ? [...new Set(input.operatingCountryIds.map((id) => String(id).trim()).filter(Boolean))]
    : [];
  if (ids.length) {
    const found = await prisma.memberState.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (found.length !== ids.length) {
      return {
        error: "Choose countries from the list",
        shape: { backing, alsoCertifies, memberStateId: null, operatingCountryIds: [] },
      };
    }
  }

  const memberStateId = input.memberStateId ? String(input.memberStateId) : null;
  if (memberStateId) {
    const state = await prisma.memberState.findUnique({ where: { id: memberStateId } });
    if (!state) {
      return {
        error: "Choose a country from the list",
        shape: { backing, alsoCertifies, memberStateId: null, operatingCountryIds: ids },
      };
    }
  }

  const governmentAuthority = type === "NSB" || (type === "CB" && backing === "GOVERNMENT");
  if (input.requireCountry && governmentAuthority && !memberStateId) {
    return {
      error: "Choose a country",
      shape: { backing, alsoCertifies, memberStateId: null, operatingCountryIds: ids },
    };
  }
  if (input.requireCountry && type === "CB" && backing === "PRIVATE" && ids.length === 0) {
    return {
      error: "Choose at least one country this certification body operates in",
      shape: { backing, alsoCertifies, memberStateId, operatingCountryIds: [] },
    };
  }

  return { error: null, shape: { backing, alsoCertifies, memberStateId, operatingCountryIds: ids } };
}

export async function saveOperatingCountries(organizationId: string, memberStateIds: string[]) {
  await prisma.organizationCountry.deleteMany({ where: { organizationId } });
  if (!memberStateIds.length) return;
  await prisma.organizationCountry.createMany({
    data: memberStateIds.map((memberStateId) => ({ organizationId, memberStateId })),
  });
}

export async function saveCompanyCountries(companyId: string, memberStateIds: string[]) {
  const found = await prisma.memberState.findMany({
    where: { id: { in: memberStateIds } },
    select: { id: true },
  });
  const ids = found.map((row) => row.id);
  await prisma.companyCountry.deleteMany({ where: { companyId } });
  if (!ids.length) return;
  await prisma.companyCountry.createMany({
    data: ids.map((memberStateId) => ({ companyId, memberStateId })),
  });
}
