export const ORG_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
] as const;

export const CB_LICENSE_TYPES = [
  { value: "TYPE1_QUALITY", label: "Type 1 — ARSO Quality Mark" },
  { value: "TYPE1_ECO", label: "Type 1 — Eco Mark Africa" },
  { value: "TYPE2", label: "Type 2 — sub-licence" },
] as const;

export const MARK_SCHEMES = [
  { value: "QUALITY", label: "ARSO Quality Mark" },
  { value: "ECO", label: "Eco Mark Africa" },
] as const;

/** Marks a certification body may grant to its clients. Eco requires the Quality Mark. */
export const CLIENT_MARK_GRANTS = [
  { value: "QUALITY", label: "ARSO Quality Mark" },
  { value: "BOTH", label: "Quality Mark and Eco Mark Africa" },
] as const;

export const LICENSE_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "EXPIRED", label: "Expired" },
  { value: "WITHDRAWN", label: "Withdrawn" },
] as const;

function inList(raw: unknown, allowed: readonly { value: string }[]) {
  const value = String(raw || "").trim().toUpperCase();
  return allowed.some((item) => item.value === value) ? value : null;
}

export function orgStatusOrNull(raw: unknown) {
  return inList(raw, ORG_STATUSES);
}

export function licenseTypeOrNull(raw: unknown) {
  return inList(raw, CB_LICENSE_TYPES);
}

export function markSchemeOrNull(raw: unknown) {
  return inList(raw, MARK_SCHEMES);
}

export function clientMarkGrantOrNull(raw: unknown): "QUALITY" | "BOTH" | null {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "QUALITY" || value === "BOTH") return value;
  return null;
}

export function grantFromLicences(licenses: { markScheme: string; status: string }[]) {
  const active = licenses.filter((license) => license.status === "APPROVED" || license.status === "PENDING");
  const quality = active.some((license) => license.markScheme === "QUALITY");
  const eco = active.some((license) => license.markScheme === "ECO");
  if (quality && eco) return "BOTH";
  if (quality) return "QUALITY";
  return "";
}

export function licenseStatusOrNull(raw: unknown) {
  return inList(raw, LICENSE_STATUSES);
}

export function dayOrNull(raw: unknown): Date | null | "invalid" {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  return new Date(`${value}T00:00:00.000Z`);
}

export function dayInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}
