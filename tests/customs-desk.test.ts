import { describe, expect, it } from "vitest";
import { customsDeskProduct, type CustomsProductInput } from "../src/lib/customs-desk";

function product(overrides: Partial<CustomsProductInput> = {}): CustomsProductInput {
  return {
    id: "prod-1",
    name: "Milled rice",
    commodity: "Rice",
    originClaimJson: JSON.stringify({
      originIso2: "KE",
      criterion: "WHOLLY_OBTAINED",
      regime: "EAC",
    }),
    company: {
      countryIso2: "UG",
      clientAccount: { organization: { name: "Nairobi Millers" } },
    },
    standardLinks: [
      {
        standardVersion: {
          standard: { id: "std-link", designation: "ARS 000", titleEn: "Unused link" },
        },
      },
    ],
    applications: [
      {
        status: "CERTIFIED",
        markScheme: "QUALITY",
        organization: { name: "Kenya Bureau of Standards" },
        coc: { certificateNo: "COC-1", status: "certified" },
        standardVersion: {
          standard: { id: "std-464", designation: "ARS 464", titleEn: "Milled rice" },
        },
        testDossier: null,
        assessmentItems: [],
        dossierAttachments: [],
      },
    ],
    ...overrides,
  };
}

describe("customs desk product", () => {
  it("fills origin, certification body, and the certified standard", () => {
    const row = customsDeskProduct(product());
    expect(row.originIso2).toBe("KE");
    expect(row.certificationBody).toBe("Kenya Bureau of Standards");
    expect(row.standardId).toBe("std-464");
    expect(row.standardLabel).toContain("ARS 464");
    expect(row.certificateNo).toBe("COC-1");
    expect(row.label).toContain("Nairobi Millers");
  });

  it("keeps every customs and inspection decision", () => {
    const row = customsDeskProduct(
      product({
        inspections: [
          { id: "ins-1", result: "CONFORM", findings: "First", inspectedAt: "2026-01-02", actor: null },
          { id: "ins-2", result: "NON_CONFORM", findings: "Second", inspectedAt: "2026-02-02", actor: null },
        ],
        clearances: [
          {
            id: "clr-1",
            decision: "HOLD",
            reason: "Wait",
            originIso2: "KE",
            destinationIso2: "UG",
            decidedAt: "2026-01-03",
            actor: null,
          },
          {
            id: "clr-2",
            decision: "ALLOW",
            reason: "Released",
            originIso2: "KE",
            destinationIso2: "RW",
            decidedAt: "2026-03-03",
            actor: null,
          },
        ],
      }),
    );
    expect(row.inspections.map((item) => item.id)).toEqual(["ins-1", "ins-2"]);
    expect(row.clearances.map((item) => item.decision)).toEqual(["HOLD", "ALLOW"]);
    expect(row.latestInspection?.id).toBe("ins-1");
    expect(row.latestCustoms?.decision).toBe("HOLD");
  });

  it("uses the company country when the product has no origin claim", () => {
    const row = customsDeskProduct(product({ originClaimJson: null, applications: [] }));
    expect(row.originIso2).toBe("UG");
    expect(row.certificationBody).toBe("");
    expect(row.standardId).toBe("std-link");
    expect(row.certificateNo).toBeNull();
  });
});
