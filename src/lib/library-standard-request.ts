export type OtherRequestItem = { designation: string; title?: string };

export function buildRequestLines(input: {
  known: Array<{ designation: string; missingText: boolean }>;
  other: Array<{ designation: string; title?: string }>;
}): string[] {
  return [
    ...input.known.map((row) => `${row.designation}${row.missingText ? " [no text]" : ""}`),
    ...input.other.map((row) => `${row.designation}${row.title ? ` — ${row.title}` : ""} [not listed]`),
  ];
}

/** Normalise untrusted `otherItems` input: trim, drop blanks, de-duplicate by designation. */
export function parseOtherItems(raw: unknown, limit = 50): Array<{ designation: string; title: string }> {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Array<{ designation: string; title: string }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const designation = String(row.designation ?? "").trim().slice(0, 200);
    if (!designation) continue;
    const key = designation.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ designation, title: String(row.title ?? "").trim().slice(0, 500) });
    if (out.length >= limit) break;
  }
  return out;
}
