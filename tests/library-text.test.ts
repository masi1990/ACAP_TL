import { describe, expect, it } from "vitest";
import { standardVersionHasText } from "../src/lib/library-text";

describe("standardVersionHasText", () => {
  it("is false when no PDFs exist", () => {
    expect(standardVersionHasText({ sourcePdfUri: null, languageFiles: [] })).toBe(false);
    expect(standardVersionHasText({ sourcePdfUri: "", languageFiles: [{ sourcePdfUri: "" }] })).toBe(false);
  });

  it("is true when version or language file has a PDF URI", () => {
    expect(standardVersionHasText({ sourcePdfUri: "arso://x.pdf", languageFiles: [] })).toBe(true);
    expect(standardVersionHasText({ sourcePdfUri: null, languageFiles: [{ sourcePdfUri: "arso://en.pdf" }] })).toBe(true);
  });
});
