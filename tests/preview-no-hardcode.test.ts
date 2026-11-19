import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const root = path.join(__dirname, "..");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("preview path has no designation hardcoding", () => {
  it("store preview server uses each standard's own PDF/machine pack", () => {
    const src = read("src/lib/store-preview-server.ts");
    expect(src).not.toMatch(/isArs464|ars464TableOfContents|ARS\s*464/);
    expect(src).toContain("ensureStandardPreviewRasters");
    expect(src).toContain("tocFromMachineClauses");
  });

  it("buildStandardPreviewPayload does not fall back to ARS 464 assets", () => {
    const src = read("src/lib/standard-preview.ts");
    expect(src).not.toMatch(/isArs464|buildArs464PdfPages|ars464TableOfContents|ars-464-2022/);
  });

  it("admin full preview does not use a fixed ARS 464 page pack", () => {
    const src = read("src/lib/admin-standard-preview.ts");
    expect(src).not.toMatch(/isArs464|buildArs464FullAdminPages|ars464TableOfContents|ars-464-2022/);
    expect(src).toContain("ensureStandardFullRasters");
  });

  it("public raster script is designation-agnostic", () => {
    const src = read("scripts/generate-standard-preview.py");
    expect(src).not.toMatch(/ARS\s*464|ARS\s*1093|Butter/i);
    expect(src).toContain("start-through-clause1");
    expect(src).toContain("find_scope_page");
  });
});
