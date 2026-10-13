import { describe, expect, it } from "vitest";
import { countryName, isCountryCode, WORLD_COUNTRIES } from "../src/lib/countries";
import { originClaimFromBody, originSummary } from "../src/lib/origin-claim";

describe("world countries", () => {
  it("includes member states and countries outside Africa", () => {
    expect(WORLD_COUNTRIES.length).toBeGreaterThan(200);
    expect(isCountryCode("KE")).toBe(true);
    expect(isCountryCode("JP")).toBe(true);
    expect(isCountryCode("CN")).toBe(true);
    expect(isCountryCode("US")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
    expect(countryName("JP")).toBe("Japan");
  });
});

describe("origin claim", () => {
  it("stores the country, criterion, and regime", () => {
    const claim = originClaimFromBody({
      originIso2: "jp",
      criterion: "WHOLLY_OBTAINED",
      regime: "GENERAL",
      producerName: "Osaka Foods",
      producerCountryIso2: "JP",
      certificateOfOriginNo: "COO-1",
    });
    expect(claim.originIso2).toBe("JP");
    expect(originSummary(JSON.stringify(claim))).toContain("Japan");
    expect(originSummary(JSON.stringify(claim))).toContain("Wholly obtained");
  });

  it("requires the producer when the applicant is an importer", () => {
    expect(() =>
      originClaimFromBody(
        { originIso2: "KE", criterion: "WHOLLY_OBTAINED", regime: "AFCFTA" },
        { importer: true },
      ),
    ).toThrow(/producer/i);
  });

  it("requires local content for value added", () => {
    expect(() =>
      originClaimFromBody({
        originIso2: "KE",
        criterion: "VALUE_ADDED",
        regime: "AFCFTA",
      }),
    ).toThrow(/local content/i);
  });
});
