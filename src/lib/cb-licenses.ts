import { randomBytes } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { clientMarkGrantOrNull, dayOrNull, licenseStatusOrNull } from "./cb-profile";
import { syncCbLicenseReminders } from "./notifications";

type LicenceDb = Prisma.TransactionClient | PrismaClient;

const ECO_WITHOUT_QUALITY =
  "A certification body must be licensed for the Quality Mark before it can licence clients for the Eco Mark.";

export async function assertCbMayGrantMark(
  cbId: string,
  mark: "QUALITY" | "ECO",
  db: LicenceDb = prisma,
) {
  const licences = await db.cbLicense.findMany({
    where: { organizationId: cbId, status: "APPROVED" },
  });
  const quality = licences.some((licence) => licence.markScheme === "QUALITY");
  const eco = licences.some((licence) => licence.markScheme === "ECO");
  if (!quality) {
    throw new Error("This certification body is not licensed to grant the ARSO Quality Mark.");
  }
  if (mark === "ECO" && !eco) {
    throw new Error(ECO_WITHOUT_QUALITY);
  }
}

export function requestedClientMark(raw: unknown): "QUALITY" | "ECO" {
  const value = String(raw || "QUALITY").trim().toUpperCase();
  if (value === "ECO") return "ECO";
  if (value === "QUALITY" || value === "") return "QUALITY";
  throw new Error("Choose the Quality Mark or the Eco Mark.");
}

const ECO_ALONE =
  "Eco Mark Africa is certified together with the Quality Mark, against its own standard.";

/** Quality only, or Quality and Eco. Eco is never stored on its own. */
export function requestedCoverage(raw: unknown): "QUALITY" | "BOTH" {
  const value = String(raw || "QUALITY").trim().toUpperCase();
  if (value === "BOTH") return "BOTH";
  if (value === "QUALITY" || value === "") return "QUALITY";
  if (value === "ECO") throw new Error(ECO_ALONE);
  throw new Error("Choose the Quality Mark, or the Quality Mark and Eco Mark Africa.");
}

export function coverageFromBody(body: Record<string, unknown>) {
  const coverage = requestedCoverage(body.markCoverage ?? body.markScheme);
  const ecoStandardVersionId = String(body.ecoStandardVersionId || "").trim();
  if (coverage === "BOTH" && !ecoStandardVersionId) {
    throw new Error("Choose the standard for Eco Mark Africa.");
  }
  return { coverage, ecoStandardVersionId };
}

/** Save the marks a certification body may grant. Eco is stored only together with Quality. */
export async function saveCbMarkLicences(organizationId: string, body: Record<string, unknown>) {
  const touched = ["clientMarks", "markScheme", "licenseNumber", "licenseStatus", "issuedAt", "expiresAt"].some(
    (key) => body[key] != null && String(body[key]).trim(),
  );
  if (!touched) return { error: null as string | null, id: null as string | null };

  const raw = String(body.clientMarks || body.markScheme || "").trim().toUpperCase();
  if (raw === "ECO") return { error: ECO_WITHOUT_QUALITY };
  const grant = clientMarkGrantOrNull(raw);
  if (!grant) {
    return { error: "Choose the Quality Mark, or the Quality Mark and Eco Mark Africa." };
  }
  const licenseStatus = body.licenseStatus ? licenseStatusOrNull(body.licenseStatus) : "APPROVED";
  if (!licenseStatus) return { error: "Choose a licence status from the list" };
  const issuedAt = dayOrNull(body.issuedAt);
  const expiresAt = dayOrNull(body.expiresAt);
  if (issuedAt === "invalid" || expiresAt === "invalid") {
    return { error: "Use a date in the form YYYY-MM-DD" };
  }

  const existing = await prisma.cbLicense.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
  const qualityExisting = existing.find((licence) => licence.markScheme === "QUALITY");
  const ecoExisting = existing.find((licence) => licence.markScheme === "ECO");
  const licenseNumber =
    String(body.licenseNumber || "").trim() ||
    qualityExisting?.licenseNumber ||
    `ARSO-CB-${randomBytes(3).toString("hex").toUpperCase()}`;

  const quality = await upsertLicence({
    existingId: qualityExisting?.id,
    organizationId,
    markScheme: "QUALITY",
    licenseType: "TYPE1_QUALITY",
    status: licenseStatus,
    licenseNumber,
    issuedAt,
    expiresAt,
  });

  if (grant === "BOTH") {
    const eco = await upsertLicence({
      existingId: ecoExisting?.id,
      organizationId,
      markScheme: "ECO",
      licenseType: "TYPE1_ECO",
      status: licenseStatus,
      licenseNumber: ecoExisting?.licenseNumber || `${licenseNumber}-ECO`,
      issuedAt,
      expiresAt,
    });
    await syncCbLicenseReminders(eco.id);
  } else if (ecoExisting && ecoExisting.status !== "WITHDRAWN") {
    await prisma.cbLicense.update({
      where: { id: ecoExisting.id },
      data: { status: "WITHDRAWN" },
    });
    await syncCbLicenseReminders(ecoExisting.id);
  }

  await syncCbLicenseReminders(quality.id);
  return { error: null as string | null, id: quality.id };
}

async function upsertLicence(input: {
  existingId?: string;
  organizationId: string;
  markScheme: "QUALITY" | "ECO";
  licenseType: string;
  status: string;
  licenseNumber: string;
  issuedAt: Date | null;
  expiresAt: Date | null;
}) {
  const data = {
    licenseType: input.licenseType,
    markScheme: input.markScheme,
    status: input.status,
    licenseNumber: input.licenseNumber,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  };
  if (input.existingId) {
    return prisma.cbLicense.update({ where: { id: input.existingId }, data });
  }
  return prisma.cbLicense.create({ data: { organizationId: input.organizationId, ...data } });
}
