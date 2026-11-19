import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { withBasePath } from "../src/lib/base-path";

describe("store preview basePath", () => {
  it("prefixes store preview navigation with /arso", () => {
    expect(withBasePath("/en/store")).toBe("/arso/en/store");
    expect(
      withBasePath("/en/store?preview=abc&lang=en"),
    ).toBe("/arso/en/store?preview=abc&lang=en");
  });

  it("Preview form and raw anchors use withBasePath (native GET must keep /arso)", () => {
    const client = readFileSync(
      path.join(__dirname, "../src/app/[locale]/store/store-client.tsx"),
      "utf8",
    );
    expect(client).toContain("action={withBasePath(`/${locale}/store`)}");
    expect(client).not.toMatch(/action=\{`\/\$\{locale\}\/store`\}/);
    expect(client).toContain("href={withBasePath(previewHref)}");
  });

  it("store/catalogue filter form uses withBasePath", () => {
    const page = readFileSync(
      path.join(__dirname, "../src/app/[locale]/store/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/action=\{withBasePath\(`\/\$\{locale\}\/\$\{mode/);
  });
});
