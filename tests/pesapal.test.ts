import { describe, expect, it } from "vitest";
import { getPesapalConfig, normalizePesapalPhone, pesapalBillingAddress, splitBuyerName } from "@/lib/pesapal";

describe("pesapal helpers", () => {
  it("splits buyer names", () => {
    expect(splitBuyerName("Trade Buyer")).toEqual({ firstName: "Trade", lastName: "Buyer" });
    expect(splitBuyerName("Ada")).toEqual({ firstName: "Ada", lastName: "" });
    expect(splitBuyerName("  ")).toEqual({ firstName: "Buyer", lastName: "" });
  });

  it("normalizes Kenyan numbers and fills the card billing form", () => {
    expect(normalizePesapalPhone("+254 712 345 678")).toBe("712345678");
    expect(normalizePesapalPhone("0712345678")).toBe("712345678");
    expect(normalizePesapalPhone("0726688456")).toBe("726688456");
    const billing = pesapalBillingAddress({
      email: "buyer@example.com",
      phone: "0712345678",
      fullName: "Ada",
    });
    expect(billing.last_name).toBe("Ada");
    expect(billing.phone_number).toBe("712345678");
    expect(billing.line_1).toBeTruthy();
    expect(billing.city).toBeTruthy();
    expect(billing.postal_code).toBeTruthy();
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
