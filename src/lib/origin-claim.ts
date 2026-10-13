import { isCountryCode, countryName } from "@/lib/countries";

export const ORIGIN_CRITERIA = [
  { value: "WHOLLY_OBTAINED", label: "Wholly obtained" },
  { value: "SUBSTANTIAL_TRANSFORMATION", label: "Substantial transformation" },
  { value: "TARIFF_SHIFT", label: "Change in tariff classification" },
  { value: "VALUE_ADDED", label: "Value added / local content" },
  { value: "CUMULATION", label: "Cumulation" },
] as const;

export const ORIGIN_REGIMES = [
  { value: "AFCFTA", label: "AfCFTA preferential" },
  { value: "EAC", label: "EAC" },
  { value: "ECOWAS", label: "ECOWAS" },
  { value: "SADC", label: "SADC" },
  { value: "COMESA", label: "COMESA" },
  { value: "GENERAL", label: "Non-preferential" },
] as const;

export type OriginClaim = {
  originIso2: string;
  criterion: string;
  regime: string;
  producerName: string;
  producerCountryIso2: string;
  certificateOfOriginNo: string;
  localContentPercent: string;
  notes: string;
};

function text(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function labelOf(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label || value;
}

export function originClaimFromBody(body: Record<string, unknown>, opts?: { importer?: boolean }): OriginClaim {
  const originIso2 = text(body.originIso2).toUpperCase();
  const criterion = text(body.criterion).toUpperCase();
  const regime = text(body.regime).toUpperCase();
  const producerName = text(body.producerName);
  const producerCountryIso2 = text(body.producerCountryIso2).toUpperCase();
  const certificateOfOriginNo = text(body.certificateOfOriginNo);
  const localContentPercent = text(body.localContentPercent);
  const notes = text(body.originNotes);

  if (!isCountryCode(originIso2)) throw new Error("Choose a country of origin");
  if (!ORIGIN_CRITERIA.some((item) => item.value === criterion)) throw new Error("Choose an origin criterion");
  if (!ORIGIN_REGIMES.some((item) => item.value === regime)) throw new Error("Choose an origin regime");
  if (producerCountryIso2 && !isCountryCode(producerCountryIso2)) {
    throw new Error("Choose a valid producer country");
  }
  if (localContentPercent) {
    const percent = Number(localContentPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error("Local content must be a percentage from 0 to 100");
    }
  }
  if ((criterion === "VALUE_ADDED" || criterion === "CUMULATION") && !localContentPercent) {
    throw new Error("Enter the local content percentage for this origin criterion");
  }
  if (opts?.importer && !producerName) throw new Error("An importer must name the producer");
  if (opts?.importer && !producerCountryIso2) throw new Error("An importer must give the producer's country");

  return {
    originIso2,
    criterion,
    regime,
    producerName,
    producerCountryIso2,
    certificateOfOriginNo,
    localContentPercent,
    notes,
  };
}

export function parseOriginClaim(json: string | null | undefined): OriginClaim | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as Partial<OriginClaim>;
    if (!value || typeof value.originIso2 !== "string") return null;
    return {
      originIso2: value.originIso2,
      criterion: value.criterion || "",
      regime: value.regime || "",
      producerName: value.producerName || "",
      producerCountryIso2: value.producerCountryIso2 || "",
      certificateOfOriginNo: value.certificateOfOriginNo || "",
      localContentPercent: value.localContentPercent || "",
      notes: value.notes || "",
    };
  } catch {
    return null;
  }
}

export function originSummary(json: string | null | undefined) {
  const claim = parseOriginClaim(json);
  if (!claim?.originIso2) return "—";
  const parts = [countryName(claim.originIso2), labelOf(ORIGIN_CRITERIA, claim.criterion)];
  if (claim.regime) parts.push(labelOf(ORIGIN_REGIMES, claim.regime));
  return parts.filter(Boolean).join(" · ");
}
