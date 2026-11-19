import { describe, expect, it } from "vitest";
import { normalizeListQuery, rowMatchesQuery } from "../src/lib/list-query";

describe("normalizeListQuery", () => {
  it("trims and maps empty to empty string", () => {
    expect(normalizeListQuery("  ab  ")).toBe("ab");
    expect(normalizeListQuery("   ")).toBe("");
    expect(normalizeListQuery(undefined)).toBe("");
  });
});

describe("rowMatchesQuery", () => {
  const row = { designation: "ARS 100", title: "Butter", sector: "Food" };

  it("matches empty query", () => {
    expect(rowMatchesQuery(row, "", ["designation", "title"])).toBe(true);
  });

  it("matches any listed field case-insensitively", () => {
    expect(rowMatchesQuery(row, "butter", ["designation", "title"])).toBe(true);
    expect(rowMatchesQuery(row, "ARS", ["designation", "title"])).toBe(true);
    expect(rowMatchesQuery(row, "food", ["designation", "title"])).toBe(false);
    expect(rowMatchesQuery(row, "food", ["designation", "title", "sector"])).toBe(true);
  });
});
