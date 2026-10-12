import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { assessMachinePackCompleteness } from "../src/lib/fidelity";
import { buildStandardPreviewPayload } from "../src/lib/standard-preview";

describe("machine pack fidelity", () => {
  it("ARS 464 sample retains mandatory slices", () => {
    const sample = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "ars-464-sample.json"), "utf8"),
    );
    const result = assessMachinePackCompleteness({
      scope: sample.scope,
      normativeReferences: sample.normativeReferences,
      requirements: sample.requirements,
      packaging: sample.packaging,
      labelling: sample.labelling,
      sampling: sample.sampling,
      contentHash: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    });
    expect(result.ok).toBe(true);
  });

  it("public PDF preview keeps Scope readable and later pages locked", () => {
    const preview = buildStandardPreviewPayload({
      editionLabel: "ARS 464:2022",
      coverTitle: "Milled rice — Specification",
      scopeEn: "This African Standard specifies requirements for milled rice.",
      ics: "67.060",
      publisher: "ARSO",
      year: 2022,
    });
    expect(preview.pdfPages.length).toBe(17);
    // Cover→intro + Clause-1 scope-only page are free; Clause 2+ pages locked
    expect(preview.pdfPages.filter((p) => p.access === "free").length).toBe(7);
    expect(preview.pdfPages.find((p) => p.label.includes("Scope"))?.access).toBe("free");
    expect(preview.pdfPages.filter((p) => p.access === "locked").length).toBe(10);
    expect(preview.tableOfContents.some((t) => t.title === "Scope" && t.includedInPreview)).toBe(
      true,
    );
  });
});
