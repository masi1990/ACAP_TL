import { prisma } from "./db";
import { normalizeTariffCode } from "./utils";

export type PublicStandardSummary = {
  standardVersionId: string;
  designation: string;
  editionLabel: string;
  titleEn: string;
  scopeEn: string;
  ics: string;
  catalogItemId: string | null;
};

/**
 * Resolve tariff → linked standards.
 * Standards are independent; TariffLine rows (per REC / length) map via StandardTariffMap.
 * Parent walk: longer codes inherit parent maps when no exact override exists.
 */
export async function resolveTariffStandardsPack(
  recCode: string,
  codeInput: string,
  opts?: { publicView?: boolean },
) {
  const publicView = opts?.publicView ?? false;
  const rec = await prisma.rec.findUnique({ where: { code: recCode.toUpperCase() } });
  if (!rec) {
    return { ok: false as const, error: "Unknown REC" };
  }
  const normalized = normalizeTariffCode(codeInput);
  if (!normalized) {
    return { ok: false as const, error: "Empty tariff code" };
  }

  let line = await prisma.tariffLine.findFirst({
    where: { recId: rec.id, codeNormalized: normalized },
    include: {
      maps: {
        include: {
          standardVersion: {
            include: {
              standard: true,
              nationalRules: { include: { nationalRule: true } },
              catalogItem: true,
            },
          },
        },
      },
      parent: true,
    },
  });

  const walked: string[] = [];
  while (line && line.maps.length === 0 && line.parentTariffLineId) {
    walked.push(line.codeDisplay);
    line = await prisma.tariffLine.findFirst({
      where: { id: line.parentTariffLineId },
      include: {
        maps: {
          include: {
            standardVersion: {
              include: {
                standard: true,
                nationalRules: { include: { nationalRule: true } },
                catalogItem: true,
              },
            },
          },
        },
        parent: true,
      },
    });
  }

  if (!line || line.maps.length === 0) {
    return {
      ok: false as const,
      error: "No standards mapped for this tariff line",
      normalized,
      rec: rec.code,
    };
  }

  // All maps for this line (and sibling REC maps for the same commodity) — public shows linked standards only
  const packs = line.maps
    .filter((m) => m.mappingEffect !== "exclude")
    .map((m) => {
      const reqs = JSON.parse(m.standardVersion.requirementsJson) as unknown[];
      const base = {
        mapId: m.id,
        mappingEffect: m.mappingEffect,
        overrideMode: m.overrideMode,
        standard: {
          id: m.standardVersion.standard.id,
          standardVersionId: m.standardVersion.id,
          designation: m.standardVersion.standard.designation,
          editionLabel: m.standardVersion.editionLabel,
          titleEn: m.standardVersion.standard.titleEn,
          scopeEn: m.standardVersion.scopeEn,
          ics: m.standardVersion.standard.ics,
          catalogItemId: m.standardVersion.catalogItem?.id ?? null,
        },
      };
      if (publicView) return base;
      return {
        ...base,
        standard: {
          ...base.standard,
          contentHash: m.standardVersion.contentHash,
          requirementCount: reqs.length,
          requirements: reqs,
          nationalRules: m.standardVersion.nationalRules.map((l) => ({
            id: l.nationalRule.id,
            title: l.nationalRule.title,
            reference: l.nationalRule.reference,
            summary: l.nationalRule.summary,
            memberStateId: l.nationalRule.memberStateId,
          })),
        },
      };
    });

  // Sibling REC codes that also map to the same standard versions (illustrates REC variance)
  const versionIds = packs.map((p) => p.standard.standardVersionId);
  const siblingMaps = await prisma.standardTariffMap.findMany({
    where: { standardVersionId: { in: versionIds } },
    include: { tariffLine: { include: { rec: true } } },
  });
  const relatedTariffLines = siblingMaps.map((m) => ({
    rec: m.tariffLine.rec.code,
    codeDisplay: m.tariffLine.codeDisplay,
    codeLength: m.tariffLine.codeLength,
    description: m.tariffLine.description,
    standardVersionId: m.standardVersionId,
  }));

  return {
    ok: true as const,
    publicView,
    modelNote:
      "Standards are independent of tariff codes. One standard may map to many REC tariff lines (HS6/HS8/HS10).",
    rec: { id: rec.id, code: rec.code, name: rec.name },
    matchedLine: {
      id: line.id,
      codeDisplay: line.codeDisplay,
      codeNormalized: line.codeNormalized,
      codeLength: line.codeLength,
      description: line.description,
      parentWalked: walked,
    },
    relatedTariffLines,
    packs,
  };
}

export async function listPublicStandardsForTariff(
  recCode: string,
  codeInput: string,
): Promise<{ ok: true; standards: PublicStandardSummary[]; meta: Awaited<ReturnType<typeof resolveTariffStandardsPack>> } | { ok: false; error: string }> {
  const result = await resolveTariffStandardsPack(recCode, codeInput, { publicView: true });
  if (!result.ok) return { ok: false, error: result.error };
  const standards: PublicStandardSummary[] = result.packs.map((p) => ({
    standardVersionId: p.standard.standardVersionId,
    designation: p.standard.designation,
    editionLabel: p.standard.editionLabel,
    titleEn: p.standard.titleEn,
    scopeEn: p.standard.scopeEn,
    ics: p.standard.ics,
    catalogItemId: p.standard.catalogItemId,
  }));
  return { ok: true, standards, meta: result };
}
