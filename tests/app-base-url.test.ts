import { describe, expect, it } from "vitest";
import { appAbsoluteUrl, normalizeAppBaseUrl } from "../src/lib/app-base-url";

describe("APP_BASE_URL normalization", () => {
  it("strips a trailing locale and keeps /arso", () => {
    expect(normalizeAppBaseUrl("https://acap.arso-oran.org/arso/en")).toBe(
      "https://acap.arso-oran.org/arso",
    );
    expect(normalizeAppBaseUrl("https://acap.arso-oran.org/arso/")).toBe(
      "https://acap.arso-oran.org/arso",
    );
  });

  it("builds callback and store URLs under /arso", () => {
    process.env.APP_BASE_URL = "https://acap.arso-oran.org/arso/en";
    expect(appAbsoluteUrl("/api/store/pesapal/ipn")).toBe(
      "https://acap.arso-oran.org/arso/api/store/pesapal/ipn",
    );
    expect(appAbsoluteUrl("/en/store/cart")).toBe("https://acap.arso-oran.org/arso/en/store/cart");
  });
});
