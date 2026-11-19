import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("admin full preview basePath", () => {
  it("FullPreviewViewer prefixes PDF image URLs with /arso", () => {
    const src = readFileSync(
      path.join(__dirname, "../src/components/admin/full-preview-viewer.tsx"),
      "utf8",
    );
    expect(src).toContain('src={withBasePath(page.imageUrl)}');
    expect(src).not.toMatch(/src=\{page\.imageUrl\}/);
  });

  it("ClientRedirect hard-navigates with withBasePath", () => {
    const src = readFileSync(
      path.join(__dirname, "../src/components/admin/client-redirect.tsx"),
      "utf8",
    );
    expect(src).toContain("withBasePath(href)");
    expect(src).toContain("window.location.replace(target)");
  });

  it("middleware login redirect clones nextUrl (keeps basePath)", () => {
    const src = readFileSync(path.join(__dirname, "../src/middleware.ts"), "utf8");
    expect(src).toContain("req.nextUrl.clone()");
    expect(src).not.toMatch(/new URL\(`\/\$\{/);
  });
});
