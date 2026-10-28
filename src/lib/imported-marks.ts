import { prisma } from "@/lib/db";
import { countryByIso2, countriesGroupedByRegion } from "@/lib/africa-regions";
import type { RegistryProduct } from "@/lib/registry";

export type PortalStatus = "listed" | "removed";

const REMOVED = "removed";

export function markSchemeLabel(markType: string) {
  return markType === "eco" ? "ECO" : "QUALITY";
}

/** Quality and eco marks copied for one live product stay one product on a manufacturer's list. */
export function groupImportedMarks<T extends { liveProductId: string; markType: string }>(marks: T[]) {
  const groups = new Map<string, T[]>();
  for (const mark of marks) {
    const rows = groups.get(mark.liveProductId) || [];
    rows.push(mark);
    groups.set(mark.liveProductId, rows);
  }
  return [...groups.values()].map((rows) =>
    [...rows].sort((a, b) => Number(a.markType === "eco") - Number(b.markType === "eco")),
  );
}

export function registryStatus(markStatus: string) {
  if (markStatus === "suspended") return "suspended";
  if (markStatus === "withdrawn") return "withdrawn";
  if (markStatus === "rejected") return "withdrawn";
  return "certified";
}

export async function portalStatusByPin(pinTexts: string[]) {
  const status = new Map<string, PortalStatus>();
  const reason = new Map<string, string>();
  if (pinTexts.length === 0) return { status, reason };
  const decisions = await prisma.productPortalDecision.findMany({
    where: { pinText: { in: pinTexts } },
    orderBy: { decidedAt: "desc" },
    select: { pinText: true, status: true, reason: true },
  });
  for (const row of decisions) {
    if (status.has(row.pinText)) continue;
    status.set(row.pinText, row.status === REMOVED ? "removed" : "listed");
    reason.set(row.pinText, row.reason);
  }
  return { status, reason };
}

/** A camera scan may hand back a verify link, or the old JSON payload, instead of a bare PIN. */
export function normalizePinInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  let text = trimmed;
  if (text.startsWith("%")) {
    try {
      text = decodeURIComponent(text);
    } catch {
      text = trimmed;
    }
  }
  const pinField = text.match(/"pin"\s*:\s*"([^"]+)"/);
  if (pinField?.[1]) return pinField[1].trim();
  const embedded = text.match(/(?:^|[?&])pin=([^&#\s]+)/i);
  if (embedded?.[1]) {
    try {
      return decodeURIComponent(embedded[1]).trim();
    } catch {
      return embedded[1].trim();
    }
  }
  return text;
}

export async function findImportedMark(code: string) {
  const trimmed = normalizePinInput(code);
  if (!trimmed) return null;
  return prisma.importedCertifiedMark.findFirst({
    where: {
      OR: [{ pinText: trimmed }, { shortId: trimmed }, { shortId: trimmed.toLowerCase() }],
    },
    include: {
      standardVersion: { include: { standard: true } },
    },
  });
}

export async function describeImportedPin(code: string) {
  const mark = await findImportedMark(code);
  if (!mark) return null;
  const portals = await portalStatusByPin([mark.pinText]);
  return {
    mark,
    removed: portals.status.get(mark.pinText) === "removed",
  };
}

export async function importedRegistryRows(): Promise<RegistryProduct[]> {
  const marks = await prisma.importedCertifiedMark.findMany({
    include: { standardVersion: { include: { standard: true } } },
    orderBy: { productName: "asc" },
  });
  const portals = await portalStatusByPin(marks.map((mark) => mark.pinText));
  const grouped = new Map<string, typeof marks>();
  for (const mark of marks) {
    if (portals.status.get(mark.pinText) === "removed") continue;
    const list = grouped.get(mark.liveProductId) || [];
    list.push(mark);
    grouped.set(mark.liveProductId, list);
  }

  return [...grouped.values()].map((group) => {
    const ordered = [...group].sort((a, b) => Number(a.markType === "eco") - Number(b.markType === "eco"));
    const primary = ordered.find((row) => row.markType !== "eco") || ordered[0];
    const countryMeta = primary.country.length === 2 ? countryByIso2(primary.country) : undefined;
    const regionGroups = countriesGroupedByRegion();
    const regionLabel = countryMeta?.region
      ? regionGroups.find((region) => region.id === countryMeta.region)?.label || countryMeta.region
      : null;
    const marksOnProduct = ordered.map((row) => markSchemeLabel(row.markType));
    const uniqueMarks = [...new Set(marksOnProduct)] as Array<"QUALITY" | "ECO">;
    const issued = primary.issuedAt || primary.importedAt;
    const expires = primary.expiresAt || issued;
    const brand = [...new Set(ordered.map((row) => row.brand.trim()).filter(Boolean))].join(", ");
    const certificates = ordered.map((row) => {
      const linked = row.standardVersion;
      const rowIssued = row.issuedAt || row.importedAt;
      return {
        certificateNo: row.certificationId,
        status: registryStatus(row.markStatus),
        markScheme: markSchemeLabel(row.markType) as "QUALITY" | "ECO",
        issuedAt: rowIssued.toISOString(),
        expiresAt: (row.expiresAt || rowIssued).toISOString(),
        standard: linked
          ? {
              designation: linked.standard.designation,
              editionLabel: linked.editionLabel,
              titleEn: linked.standard.titleEn,
              standardVersionId: linked.id,
            }
          : {
              designation: "Standard not linked yet",
              editionLabel: row.sourceStandardText || "—",
              titleEn: row.sourceStandardText || "Standard not linked yet",
              standardVersionId: "",
            },
      };
    });
    return {
      id: `live-${primary.liveProductId}`,
      productName: primary.productName,
      commodity: brand || primary.productName,
      companyName: primary.companyName,
      countryIso2: countryMeta?.iso2 || (primary.country.length === 2 ? primary.country.toUpperCase() : ""),
      countryName: countryMeta?.name || primary.country || "—",
      regionId: countryMeta?.region || null,
      regionLabel,
      certificateNo: primary.certificationId,
      status: registryStatus(primary.markStatus),
      markScheme: uniqueMarks.includes("QUALITY") && uniqueMarks.includes("ECO") ? "BOTH" : uniqueMarks[0] || "QUALITY",
      marks: uniqueMarks,
      issuedAt: issued.toISOString(),
      expiresAt: expires.toISOString(),
      certificates,
      standard: certificates[0].standard,
      tariff: null,
      cbName: primary.cbName,
      pinCode: primary.pinText,
      pinCodes: ordered.map((row) => row.pinText),
      brand: brand || undefined,
    };
  });
}

/** Distinct copied products listed against each standard shown on a catalogue card. */
export async function importedProductCountsByStandard(versionIds: string[]) {
  const counts = new Map<string, number>();
  if (versionIds.length === 0) return counts;
  const shown = await prisma.standardVersion.findMany({
    where: { id: { in: versionIds } },
    select: { id: true, standardId: true },
  });
  if (shown.length === 0) return counts;
  const family = await prisma.standardVersion.findMany({
    where: { standardId: { in: [...new Set(shown.map((row) => row.standardId))] } },
    select: { id: true, standardId: true },
  });
  const versionToStandard = new Map(family.map((row) => [row.id, row.standardId]));
  const marks = await prisma.importedCertifiedMark.findMany({
    where: { standardVersionId: { in: family.map((row) => row.id) } },
    select: { standardVersionId: true, liveProductId: true, pinText: true },
  });
  const portals = await portalStatusByPin(marks.map((mark) => mark.pinText));
  const products = new Map<string, Set<string>>();
  for (const mark of marks) {
    if (!mark.standardVersionId) continue;
    if (portals.status.get(mark.pinText) === "removed") continue;
    const standardId = versionToStandard.get(mark.standardVersionId);
    if (!standardId) continue;
    const bucket = products.get(standardId) ?? new Set<string>();
    bucket.add(mark.liveProductId);
    products.set(standardId, bucket);
  }
  for (const row of shown) counts.set(row.id, products.get(row.standardId)?.size ?? 0);
  return counts;
}
