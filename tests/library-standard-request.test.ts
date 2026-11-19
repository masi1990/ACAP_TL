import { describe, expect, it } from "vitest";
import { buildRequestLines, parseOtherItems } from "../src/lib/library-standard-request";

describe("buildRequestLines", () => {
  it("marks known standards without text", () => {
    expect(
      buildRequestLines({
        known: [
          { designation: "ARS 1", missingText: false },
          { designation: "ARS 2", missingText: true },
        ],
        other: [],
      }),
    ).toEqual(["ARS 1", "ARS 2 [no text]"]);
  });

  it("marks other items as not listed with optional title", () => {
    expect(
      buildRequestLines({
        known: [],
        other: [{ designation: "ISO 9001" }, { designation: "ISO 14001", title: "Environmental" }],
      }),
    ).toEqual(["ISO 9001 [not listed]", "ISO 14001 — Environmental [not listed]"]);
  });
});

describe("parseOtherItems", () => {
  it("trims, drops blank designations, and de-duplicates", () => {
    expect(
      parseOtherItems([
        { designation: "  ISO 1 ", title: " T " },
        { designation: "" },
        { designation: "iso 1" },
        "bad",
        { designation: "X" },
      ]),
    ).toEqual([{ designation: "ISO 1", title: "T" }, { designation: "X", title: "" }]);
  });
  it("returns [] for non-arrays", () => {
    expect(parseOtherItems(undefined)).toEqual([]);
  });
});
