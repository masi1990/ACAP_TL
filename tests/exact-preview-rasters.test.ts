import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("public preview rasters", () => {
  it("publishes starting pages through Clause 1 Scope and hides Clause 2+", () => {
    const script = readFileSync(
      path.join(process.cwd(), "scripts", "generate-standard-preview.py"),
      "utf8",
    );
    expect(script).toContain('cutoff": "start-through-clause1"');
    expect(script).toContain("for i in range(last_free + 1)");
    expect(script).toContain("scope_page_image");
    expect(script).not.toContain("blur_locked");
  });

  it("store viewer keeps enlarged free pages only", () => {
    const viewer = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/store/preview-viewer.tsx"),
      "utf8",
    );
    expect(viewer).toContain("withBasePath(page.imageUrl)");
    expect(viewer).toMatch(/md:min-w-\[min\(100%,79[04]px\)\]/);
    expect(viewer).toContain('page.access === "free"');
  });

  it("preview page URLs go through /api/uploads so post-start rasters are reachable", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/preview-raster.ts"), "utf8");
    expect(src).toContain("/api/uploads/");
    expect(src).toContain("publicUploadToApiUrl");
  });
});

