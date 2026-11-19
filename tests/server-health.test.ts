import { describe, expect, it } from "vitest";
import {
  aggregateHealthStatus,
  apiPathConfiguredOk,
  diskPercentUsed,
  parseDatabaseUrlIdentity,
} from "../src/lib/server-health";

describe("diskPercentUsed", () => {
  it("rounds to one decimal and handles zero total", () => {
    expect(diskPercentUsed(50, 100)).toBe(50);
    expect(diskPercentUsed(1, 3)).toBeCloseTo(33.3, 1);
    expect(diskPercentUsed(10, 0)).toBe(0);
  });
});

describe("parseDatabaseUrlIdentity", () => {
  it("returns host and database without credentials", () => {
    expect(parseDatabaseUrlIdentity("postgresql://arso:secret@127.0.0.1:5432/acap_tl?schema=public")).toEqual({
      host: "127.0.0.1",
      database: "acap_tl",
    });
  });

  it("returns empty object for missing/invalid URL", () => {
    expect(parseDatabaseUrlIdentity(undefined)).toEqual({});
    expect(parseDatabaseUrlIdentity("not-a-url")).toEqual({});
  });
});

describe("apiPathConfiguredOk", () => {
  it("passes only for /arso and /arso/api", () => {
    expect(apiPathConfiguredOk("/arso", "/arso/api")).toBe(true);
    expect(apiPathConfiguredOk("", "/api")).toBe(false);
    expect(apiPathConfiguredOk("/arso", "/api")).toBe(false);
  });
});

describe("aggregateHealthStatus", () => {
  it("is down when database is disconnected", () => {
    expect(
      aggregateHealthStatus({
        databaseConnected: false,
        servicesDown: false,
        diskCritical: false,
        apiPathFail: false,
      }),
    ).toBe("down");
  });

  it("is degraded for non-core failures when DB is up", () => {
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: true,
        diskCritical: false,
        apiPathFail: false,
      }),
    ).toBe("degraded");
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: false,
        diskCritical: true,
        apiPathFail: false,
      }),
    ).toBe("degraded");
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: false,
        diskCritical: false,
        apiPathFail: true,
      }),
    ).toBe("degraded");
  });

  it("is healthy when all clear", () => {
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: false,
        diskCritical: false,
        apiPathFail: false,
      }),
    ).toBe("healthy");
  });
});
