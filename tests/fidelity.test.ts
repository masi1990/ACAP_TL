import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { assessMachinePackCompleteness } from "../src/lib/fidelity";
import { buildStandardPreviewPayload } from "../src/lib/standard-preview";

describe("machine pack fidelity", () => {
  it("sample machine pack retains mandatory slices", () => {
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

  it("public preview is generic — no designation-specific page pack without pdfPages", () => {
    const preview = buildStandardPreviewPayload({
      editionLabel: "ARS 9999:2025",
      coverTitle: "Example product — Specification",
      scopeEn: "This African Standard specifies requirements for an example product.",
      ics: "67.060",
      publisher: "ARSO",
      year: 2025,
      designation: "ARS 9999",
    });
    // Without a per-standard PDF raster pack, pdfPages stay empty (HTML fallback only).
    expect(preview.pdfPages).toEqual([]);
    expect(preview.pages.some((p) => p.kind === "scope")).toBe(true);
    expect(preview.tableOfContents.filter((t) => t.includedInPreview).map((t) => t.number)).toEqual(["1"]);
  });

  it("supplied pdfPages are used as-is for that standard", () => {
    const preview = buildStandardPreviewPayload({
      editionLabel: "ARS 1000:2024",
      coverTitle: "Widget — Specification",
      scopeEn: "This African Standard specifies requirements for widgets.",
      ics: "01.040",
      publisher: "ARSO",
      year: 2024,
      designation: "ARS 1000",
      pdfPages: [
        { n: 1, label: "Cover", access: "free", imageUrl: "/uploads/standards/preview/x/page-01.png" },
        { n: 2, label: "1 Scope", access: "free", imageUrl: "/uploads/standards/preview/x/page-02.png" },
      ],
    });
    expect(preview.pdfPages).toHaveLength(2);
    expect(preview.pdfPages.every((p) => p.access === "free")).toBe(true);
    expect(preview.pdfPages.some((p) => p.imageUrl.includes("ars-464"))).toBe(false);
  });
});
