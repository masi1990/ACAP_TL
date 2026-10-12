/**
 * African countries grouped by geographic region for the public certified-products registry.
 * Countries within each region are sorted alphabetically by name.
 */

export type AfricaCountry = {
  iso2: string;
  name: string;
  region: AfricaRegionId;
};

export type AfricaRegionId =
  | "NORTH"
  | "WEST"
  | "CENTRAL"
  | "EAST"
  | "SOUTHERN";

export const AFRICA_REGIONS: Array<{ id: AfricaRegionId; label: string }> = [
  { id: "NORTH", label: "North Africa" },
  { id: "WEST", label: "West Africa" },
  { id: "CENTRAL", label: "Central Africa" },
  { id: "EAST", label: "East Africa" },
  { id: "SOUTHERN", label: "Southern Africa" },
];

/** ISO2 → country, covering AU membership used by ARSO / ACAP registry. */
const AFRICA_COUNTRIES_RAW: AfricaCountry[] = [
  // North
  { iso2: "DZ", name: "Algeria", region: "NORTH" },
  { iso2: "EG", name: "Egypt", region: "NORTH" },
  { iso2: "LY", name: "Libya", region: "NORTH" },
  { iso2: "MA", name: "Morocco", region: "NORTH" },
  { iso2: "SD", name: "Sudan", region: "NORTH" },
  { iso2: "TN", name: "Tunisia", region: "NORTH" },
  // West
  { iso2: "BJ", name: "Benin", region: "WEST" },
  { iso2: "BF", name: "Burkina Faso", region: "WEST" },
  { iso2: "CV", name: "Cabo Verde", region: "WEST" },
  { iso2: "CI", name: "Côte d'Ivoire", region: "WEST" },
  { iso2: "GM", name: "Gambia", region: "WEST" },
  { iso2: "GH", name: "Ghana", region: "WEST" },
  { iso2: "GN", name: "Guinea", region: "WEST" },
  { iso2: "GW", name: "Guinea-Bissau", region: "WEST" },
  { iso2: "LR", name: "Liberia", region: "WEST" },
  { iso2: "ML", name: "Mali", region: "WEST" },
  { iso2: "MR", name: "Mauritania", region: "WEST" },
  { iso2: "NE", name: "Niger", region: "WEST" },
  { iso2: "NG", name: "Nigeria", region: "WEST" },
  { iso2: "SN", name: "Senegal", region: "WEST" },
  { iso2: "SL", name: "Sierra Leone", region: "WEST" },
  { iso2: "TG", name: "Togo", region: "WEST" },
  // Central
  { iso2: "CM", name: "Cameroon", region: "CENTRAL" },
  { iso2: "CF", name: "Central African Republic", region: "CENTRAL" },
  { iso2: "TD", name: "Chad", region: "CENTRAL" },
  { iso2: "CG", name: "Congo", region: "CENTRAL" },
  { iso2: "CD", name: "Democratic Republic of the Congo", region: "CENTRAL" },
  { iso2: "GQ", name: "Equatorial Guinea", region: "CENTRAL" },
  { iso2: "GA", name: "Gabon", region: "CENTRAL" },
  { iso2: "ST", name: "São Tomé and Príncipe", region: "CENTRAL" },
  // East
  { iso2: "BI", name: "Burundi", region: "EAST" },
  { iso2: "KM", name: "Comoros", region: "EAST" },
  { iso2: "DJ", name: "Djibouti", region: "EAST" },
  { iso2: "ER", name: "Eritrea", region: "EAST" },
  { iso2: "ET", name: "Ethiopia", region: "EAST" },
  { iso2: "KE", name: "Kenya", region: "EAST" },
  { iso2: "MG", name: "Madagascar", region: "EAST" },
  { iso2: "MW", name: "Malawi", region: "EAST" },
  { iso2: "MU", name: "Mauritius", region: "EAST" },
  { iso2: "RW", name: "Rwanda", region: "EAST" },
  { iso2: "SC", name: "Seychelles", region: "EAST" },
  { iso2: "SO", name: "Somalia", region: "EAST" },
  { iso2: "SS", name: "South Sudan", region: "EAST" },
  { iso2: "TZ", name: "Tanzania", region: "EAST" },
  { iso2: "UG", name: "Uganda", region: "EAST" },
  // Southern
  { iso2: "AO", name: "Angola", region: "SOUTHERN" },
  { iso2: "BW", name: "Botswana", region: "SOUTHERN" },
  { iso2: "SZ", name: "Eswatini", region: "SOUTHERN" },
  { iso2: "LS", name: "Lesotho", region: "SOUTHERN" },
  { iso2: "MZ", name: "Mozambique", region: "SOUTHERN" },
  { iso2: "NA", name: "Namibia", region: "SOUTHERN" },
  { iso2: "ZA", name: "South Africa", region: "SOUTHERN" },
  { iso2: "ZM", name: "Zambia", region: "SOUTHERN" },
  { iso2: "ZW", name: "Zimbabwe", region: "SOUTHERN" },
];

export const AFRICA_COUNTRIES: AfricaCountry[] = [...AFRICA_COUNTRIES_RAW].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function countryByIso2(iso2: string) {
  return AFRICA_COUNTRIES.find((c) => c.iso2 === iso2.toUpperCase()) || null;
}

export function countriesGroupedByRegion() {
  return AFRICA_REGIONS.map((region) => ({
    ...region,
    countries: AFRICA_COUNTRIES.filter((c) => c.region === region.id).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }));
}
