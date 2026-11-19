import { describe, expect, it } from "vitest";
import {
  canAccessComplaintsInbox,
  canViewAllComplaints,
  complaintListWhere,
} from "../src/lib/complaint-access";

function user(opts: {
  globalRoles?: string[];
  cbIds?: string[];
  memberships?: Array<{ role: string; organization: { id: string; type: string } }>;
}) {
  const cbIds = opts.cbIds || [];
  return {
    rolesGlobal: (opts.globalRoles || []).join(","),
    roleAssignments: [] as Array<{ roleCode: string; organizationId: string | null }>,
    memberships: [
      ...cbIds.map((id) => ({ role: "CB_OFFICER", organization: { id, type: "CB" } })),
      ...(opts.memberships || []),
    ],
  };
}

describe("canViewAllComplaints", () => {
  it("allows ARSO admin and market surveillance officers", () => {
    expect(canViewAllComplaints(user({ globalRoles: ["ARSO_ADMIN"] }))).toBe(true);
    expect(
      canViewAllComplaints(
        user({
          memberships: [
            { role: "SURVEILLANCE_OFFICER", organization: { id: "ms-1", type: "MARKET_SURVEILLANCE" } },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("does not treat CB-only users as global viewers", () => {
    expect(canViewAllComplaints(user({ cbIds: ["cb-1"] }))).toBe(false);
  });
});

describe("complaintListWhere", () => {
  it("returns empty where for global viewers", () => {
    expect(complaintListWhere(user({ globalRoles: ["ARSO_ADMIN"] }))).toEqual({});
  });

  it("scopes CB users to their routed org ids", () => {
    expect(complaintListWhere(user({ cbIds: ["cb-1", "cb-2"] }))).toEqual({
      routedCbId: { in: ["cb-1", "cb-2"] },
    });
  });

  it("returns null when the user cannot open the inbox", () => {
    expect(complaintListWhere(user({ globalRoles: [] }))).toBeNull();
    expect(canAccessComplaintsInbox(user({ globalRoles: [] }))).toBe(false);
  });

  it("allows CB officers with a CB membership into the inbox", () => {
    expect(canAccessComplaintsInbox(user({ cbIds: ["cb-1"] }))).toBe(true);
  });
});
