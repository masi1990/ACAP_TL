/** Reference REC membership. A country may appear in more than one list. ARSO can edit these later. */
export const REFERENCE_RECS: Array<{ code: string; name: string; iso2: string[] }> = [
  {
    code: "EAC",
    name: "East African Community",
    iso2: ["BI", "CD", "KE", "RW", "SO", "SS", "TZ", "UG"],
  },
  {
    code: "COMESA",
    name: "Common Market for Eastern and Southern Africa",
    iso2: ["BI", "CD", "DJ", "EG", "ER", "ET", "KE", "KM", "LY", "MG", "MU", "MW", "RW", "SC", "SD", "SO", "SZ", "TN", "UG", "ZM", "ZW"],
  },
  {
    code: "ECCAS",
    name: "Economic Community of Central African States",
    iso2: ["AO", "BI", "CD", "CF", "CG", "CM", "GA", "GQ", "RW", "ST", "TD"],
  },
  {
    code: "ECOWAS",
    name: "Economic Community of West African States",
    iso2: ["BJ", "CI", "CV", "GH", "GM", "GN", "GW", "LR", "NG", "SL", "SN", "TG"],
  },
  {
    code: "IGAD",
    name: "Intergovernmental Authority on Development",
    iso2: ["DJ", "ER", "ET", "KE", "SD", "SO", "SS", "UG"],
  },
  {
    code: "SADC",
    name: "Southern African Development Community",
    iso2: ["AO", "BW", "CD", "KM", "LS", "MG", "MU", "MW", "MZ", "NA", "SC", "SZ", "TZ", "ZA", "ZM", "ZW"],
  },
  {
    code: "UMA",
    name: "Arab Maghreb Union",
    iso2: ["DZ", "LY", "MA", "MR", "TN"],
  },
  {
    code: "CEN-SAD",
    name: "Community of Sahel-Saharan States",
    iso2: [
      "BF", "BJ", "CF", "CI", "CV", "DJ", "EG", "ER", "GH", "GM", "GN", "GW", "KE", "LR", "LY", "MA", "ML", "MR", "NE", "NG", "SD", "SL", "SN", "SO", "ST", "TD", "TG", "TN", "KM",
    ],
  },
];
