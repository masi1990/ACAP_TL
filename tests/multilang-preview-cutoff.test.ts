import { describe, expect, it } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

function runPreview(pdfRel: string) {
  const pdf = path.join(process.cwd(), pdfRel);
  const out = mkdtempSync(path.join(tmpdir(), "acap-preview-"));
  try {
    const script = path.join(process.cwd(), "scripts", "generate-standard-preview.py");
    execFileSync(process.env.PYTHON || "python3", [script, pdf, out], { stdio: "pipe" });
    const manifest = JSON.parse(readFileSync(path.join(out, "manifest.json"), "utf8")) as {
      cutoff: string;
      scopeLabel?: string;
      pages: Array<{ label: string; scopeOnly?: boolean; n: number }>;
    };
    const text = readFileSync(path.join(out, "preview-text.txt"), "utf8");
    return { manifest, text };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

describe("multilingual public preview cutoff", () => {
  it("cuts English ARS 1093 after Clause 1 Scope", () => {
    const { manifest } = runPreview(
      "public/uploads/standards/1794853924961-8e13e9-ARS_1093_2025_Butter___Specification.pdf",
    );
    expect(manifest.cutoff).toBe("start-through-clause1");
    expect(manifest.scopeLabel).toBe("1 Scope");
    expect(manifest.pages.at(-1)?.scopeOnly).toBe(true);
    expect(manifest.pages.length).toBeLessThan(13);
  });

  it("cuts French ARS 1184 after Champ d'application", () => {
    const { manifest, text } = runPreview(
      "public/uploads/standards/1793257942308-ddefa6-ARS_1184-2025__F__Maquereau_frais__congel__et_en_conserve___Sp_cifications.pdf",
    );
    expect(manifest.cutoff).toBe("start-through-clause1");
    expect(manifest.scopeLabel).toMatch(/Champ d'application/i);
    expect(text).toMatch(/Champ d'application|spécifie/i);
    expect(manifest.pages.at(-1)?.scopeOnly).toBe(true);
  });

  it("cuts Portuguese synthetic edition after Campo de aplicação / Âmbito", () => {
    const { manifest } = runPreview("tests/fixtures/preview-langs/ars-1184-pt-synthetic.pdf");
    expect(manifest.cutoff).toBe("start-through-clause1");
    expect(manifest.scopeLabel).toMatch(/Campo de aplicação|Âmbito/i);
    expect(manifest.pages).toHaveLength(3);
    expect(manifest.pages.at(-1)?.scopeOnly).toBe(true);
  });

  it("cuts Arabic synthetic edition after نطاق التطبيق", () => {
    const { manifest } = runPreview("tests/fixtures/preview-langs/ars-1184-ar-synthetic.pdf");
    expect(manifest.cutoff).toBe("start-through-clause1");
    expect(manifest.scopeLabel).toContain("نطاق التطبيق");
    expect(manifest.pages).toHaveLength(3);
    expect(manifest.pages.at(-1)?.scopeOnly).toBe(true);
    expect(manifest.pages.at(-1)?.label).toContain("نطاق التطبيق");
  });
});
