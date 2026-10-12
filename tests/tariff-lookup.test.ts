import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { resolveTariffStandardsPack } from "../src/lib/tariff";

const prisma = new PrismaClient();

/**
 * Bootstrap seed has no catalogue data. Tests create a minimal multi-REC
 * tariff map for one standard (one standard → many tariff lines).
 */
describe("tariff → standards pack", () => {
  beforeAll(async () => {
    const recs = [
      { id: "rec-eac-test", code: "EAC", name: "East African Community" },
      { id: "rec-comesa-test", code: "COMESA", name: "COMESA" },
      { id: "rec-sadc-test", code: "SADC", name: "SADC" },
      { id: "rec-ecowas-test", code: "ECOWAS", name: "ECOWAS" },
    ];
    for (const r of recs) {
      await prisma.rec.upsert({
        where: { code: r.code },
        create: r,
        update: { name: r.name },
      });
    }

    const lines: Array<{ id: string; recCode: string; codeDisplay: string; codeNormalized: string }> = [
      { id: "tl-test-eac-100630", recCode: "EAC", codeDisplay: "1006.30", codeNormalized: "100630" },
      { id: "tl-test-comesa-100630", recCode: "COMESA", codeDisplay: "100630", codeNormalized: "100630" },
      { id: "tl-test-sadc-100630", recCode: "SADC", codeDisplay: "1006.30", codeNormalized: "100630" },
      { id: "tl-test-ecowas-10063000", recCode: "ECOWAS", codeDisplay: "1006.30.00", codeNormalized: "10063000" },
      { id: "tl-test-ecowas-1006300000", recCode: "ECOWAS", codeDisplay: "1006300000", codeNormalized: "1006300000" },
    ];

    for (const line of lines) {
      const rec = await prisma.rec.findUniqueOrThrow({ where: { code: line.recCode } });
      await prisma.tariffLine.upsert({
        where: {
          recId_codeNormalized_effectiveFrom: {
            recId: rec.id,
            codeNormalized: line.codeNormalized,
            effectiveFrom: new Date("2020-01-01"),
          },
        },
        create: {
          id: line.id,
          recId: rec.id,
          codeDisplay: line.codeDisplay,
          codeNormalized: line.codeNormalized,
          codeLength: line.codeNormalized.length,
          hsHeading: line.codeNormalized.slice(0, 4),
          description: `Test rice line ${line.codeDisplay}`,
          effectiveFrom: new Date("2020-01-01"),
        },
        update: { codeDisplay: line.codeDisplay, description: `Test rice line ${line.codeDisplay}` },
      });
    }

    const reqs = Array.from({ length: 12 }, (_, i) => ({
      id: `R${i + 1}`,
      clause: "4",
      text: `Requirement ${i + 1}`,
    }));
    const scopeEn =
      "This African Standard specifies the requirements for milled rice of the species Oryza sativa L.";

    await prisma.standard.upsert({
      where: { designation: "ARS 464" },
      create: {
        id: "std-ars-464-test",
        designation: "ARS 464",
        titleEn: "Milled rice — Specification",
        ics: "67.060",
        publisher: "ARSO",
        versions: {
          create: {
            id: "sv-ars-464-test",
            editionLabel: "ARS 464:2022",
            year: 2022,
            effectiveFrom: new Date("2022-01-01"),
            publicationStatus: "PUBLISHED",
            contentHash: "sha256:test",
            scopeEn,
            machineDocJson: JSON.stringify({ requirements: reqs }),
            requirementsJson: JSON.stringify(reqs),
            normativeRefsJson: "[]",
          },
        },
      },
      update: { titleEn: "Milled rice — Specification" },
    });

    const ver = await prisma.standardVersion.findFirstOrThrow({
      where: { standard: { designation: "ARS 464" } },
      orderBy: { year: "desc" },
    });

    await prisma.standardVersion.update({
      where: { id: ver.id },
      data: {
        editionLabel: "ARS 464:2022",
        scopeEn,
        requirementsJson: JSON.stringify(reqs),
        machineDocJson: JSON.stringify({ requirements: reqs }),
        publicationStatus: "PUBLISHED",
      },
    });

    for (const line of lines) {
      const tl = await prisma.tariffLine.findFirstOrThrow({
        where: {
          codeNormalized: line.codeNormalized,
          rec: { code: line.recCode },
        },
      });
      const existing = await prisma.standardTariffMap.findUnique({
        where: {
          standardVersionId_tariffLineId: {
            standardVersionId: ver.id,
            tariffLineId: tl.id,
          },
        },
      });
      if (!existing) {
        await prisma.standardTariffMap.create({
          data: {
            id: `map-test-${line.id}`,
            standardVersionId: ver.id,
            tariffLineId: tl.id,
            mappingEffect: "include",
            effectiveFrom: new Date("2022-01-01"),
          },
        });
      }
    }
  });

  it("resolves EAC/COMESA/SADC HS6 and ECOWAS HS8/HS10 to ARS 464", async () => {
    const fixtures = [
      ["EAC", "1006.30"],
      ["COMESA", "100630"],
      ["SADC", "1006.30"],
      ["ECOWAS", "1006.30.00"],
      ["ECOWAS", "1006300000"],
    ] as const;

    for (const [rec, code] of fixtures) {
      const result = await resolveTariffStandardsPack(rec, code, { publicView: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.packs[0]?.standard.editionLabel).toBe("ARS 464:2022");
        expect(result.packs[0]?.standard.scopeEn.length).toBeGreaterThan(20);
        expect(result.packs[0]?.standard.titleEn.toLowerCase()).toContain("rice");
        expect(
          "requirements" in (result.packs[0]?.standard as object)
            ? (result.packs[0].standard as { requirements?: unknown }).requirements
            : undefined,
        ).toBeUndefined();
        expect(result.relatedTariffLines.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("includes full requirements for hub/internal view", async () => {
    const result = await resolveTariffStandardsPack("EAC", "1006.30", { publicView: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const std = result.packs[0]?.standard as { requirementCount?: number; requirements?: unknown[] };
      expect(std.requirementCount).toBeGreaterThan(10);
      expect(Array.isArray(std.requirements)).toBe(true);
    }
  });
});
