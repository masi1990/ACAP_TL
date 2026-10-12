import { describe, expect, it } from "vitest";
import { getPesapalConfig, splitBuyerName } from "@/lib/pesapal";

describe("pesapal helpers", () => {
  it("splits buyer names", () => {
    expect(splitBuyerName("Trade Buyer")).toEqual({ firstName: "Trade", lastName: "Buyer" });
    expect(splitBuyerName("Ada")).toEqual({ firstName: "Ada", lastName: "" });
    expect(splitBuyerName("  ")).toEqual({ firstName: "Buyer", lastName: "" });
  });

  it("reports unconfigured when keys missing", () => {
    const prevKey = process.env.PESAPAL_CONSUMER_KEY;
    const prevSecret = process.env.PESAPAL_CONSUMER_SECRET;
    delete process.env.PESAPAL_CONSUMER_KEY;
    delete process.env.PESAPAL_CONSUMER_SECRET;
    expect(getPesapalConfig().configured).toBe(false);
    if (prevKey !== undefined) process.env.PESAPAL_CONSUMER_KEY = prevKey;
    if (prevSecret !== undefined) process.env.PESAPAL_CONSUMER_SECRET = prevSecret;
  });
});
