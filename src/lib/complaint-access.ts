import type { Prisma } from "@prisma/client";
import { can, certificationBodyIds, hasGlobalPermission } from "@/lib/rbac";

type ComplaintUser = Parameters<typeof can>[0];

/** Hub / admin / market surveillance see every complaint. */
export function canViewAllComplaints(user: ComplaintUser): boolean {
  if (can(user, "surveillance:operate")) return true;
  if (hasGlobalPermission(user, "audit:read")) return true;
  if (hasGlobalPermission(user, "cb:write")) return true;
  if (hasGlobalPermission(user, "institutions:write")) return true;
  return false;
}

/** True when the user may open the complaints inbox at all. */
export function canAccessComplaintsInbox(user: ComplaintUser): boolean {
  if (canViewAllComplaints(user)) return true;
  if (can(user, "cb:read") && certificationBodyIds(user).length > 0) return true;
  return false;
}

/**
 * Prisma where for the inbox. `null` means the user has no access.
 * CB staff are limited to complaints routed to their certification bodies.
 */
export function complaintListWhere(user: ComplaintUser): Prisma.ConsumerComplaintWhereInput | null {
  if (canViewAllComplaints(user)) return {};
  const cbIds = certificationBodyIds(user);
  if (can(user, "cb:read") && cbIds.length > 0) {
    return { routedCbId: { in: cbIds } };
  }
  return null;
}
