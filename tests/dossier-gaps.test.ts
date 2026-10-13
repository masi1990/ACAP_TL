import { describe, expect, it } from "vitest";
import { dossierGaps } from "../src/lib/dossier";

const dossier = {
  laboratoryName: "Nairobi Lab",
  reportNo: "R-10",
  sampleCode: "S-10",
  testedAt: "2026-10-01",
};

describe("dossier gaps", () => {
  it("asks for the laboratory, the sample, and the requirements", () => {
    expect(dossierGaps(null, [])).toEqual([
      "Laboratory name",
      "Test report number",
      "Sample code",
      "Date tested",
      "Requirements from the standard",
    ]);
  });

  it("asks for a measured value and a laboratory file on table rows", () => {
    const gaps = dossierGaps(dossier, [
      {
        source: "STANDARD",
        kind: "table",
        pass: true,
        measuredValue: "",
        evidenceCount: 0,
      },
    ]);
    expect(gaps).toEqual([
      "A measured value on every test in the standard tables",
      "A laboratory file on every test in the standard tables",
    ]);
  });

  it("is clear when every requirement passes and annexes are absent", () => {
    expect(
      dossierGaps(dossier, [
        {
          source: "STANDARD",
          kind: "clause",
          pass: true,
          measuredValue: "",
          evidenceCount: 0,
        },
      ]),
    ).toEqual([]);
  });
});
