import { describe, expect, it } from "vitest";
import { duplicateLanguagePdfError } from "@/lib/standard-meta";

describe("duplicate language PDF guard", () => {
  it("explains that identical other-language uploads are rejected", () => {
    expect(duplicateLanguagePdfError("French PDF", "en")).toMatch(/identical/i);
    expect(duplicateLanguagePdfError("French PDF", "en")).toMatch(/French/i);
    expect(duplicateLanguagePdfError("French PDF", "en")).toMatch(/empty/i);
  });
});
