import { formatCents } from "@/lib/utils";

export const DISTRIBUTIONS = ["PAID", "FREE_VIEW", "FREE_DOWNLOAD"] as const;

export type Distribution = (typeof DISTRIBUTIONS)[number];

export function isDistribution(value: string): value is Distribution {
  return (DISTRIBUTIONS as readonly string[]).includes(value);
}

export function distributionLabel(value: string) {
  if (value === "FREE_VIEW") return "Free, view only";
  if (value === "FREE_DOWNLOAD") return "Free, download";
  return "Priced";
}

export function openReading(value: string) {
  return value === "FREE_VIEW" || value === "FREE_DOWNLOAD";
}

/** What the webstore shows for a listed standard. */
export function webstoreListingLabel(item: {
  distribution: string;
  priceCents: number;
  currency: string;
  active: boolean;
} | null | undefined) {
  if (!item?.active) return "Not listed";
  if (item.distribution === "FREE_VIEW") return "Free · view only";
  if (item.distribution === "FREE_DOWNLOAD") return "Free · download";
  return formatCents(item.priceCents, item.currency);
}
