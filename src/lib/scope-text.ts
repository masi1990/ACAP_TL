/**
 * Public surfaces may only expose Clause 1 Scope.
 * Machine packs still retain the full document separately.
 */

/** Cut text at the start of clause 2 (or the next top-level clause after 1). */
export function extractClause1ScopeOnly(text: string): string {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";

  // Prefer starting at "1 Scope" / "1. Scope" heading when present
  const startMatch = raw.match(/(?:^|\n)\s*1(?:\.0)?\s*[\s.]*\s*Scope\b[^\n]*/i);
  let body = raw;
  if (startMatch && startMatch.index != null) {
    body = raw.slice(startMatch.index).replace(/^\n/, "");
  } else if (/^Scope\b/i.test(raw)) {
    body = raw;
  } else {
    const loose = raw.match(/(?:^|\n)(Scope\b[^\n]*\n[\s\S]*)/i);
    if (loose) body = loose[1];
  }

  // Stop at clause 2 (normative references or any top-level "2 …")
  const endPatterns = [
    /\n\s*2(?:\.0)?\s+Normative\s+references?\b/i,
    /\n\s*2(?:\.0)?\s*[\s.]*\s*Normative\b/i,
    /\n\s*2(?:\.0)?\s+[A-Z][A-Za-z]/i, // "2 Definitions", "2 Terms", etc.
  ];

  let end = body.length;
  for (const re of endPatterns) {
    const m = body.match(re);
    if (m && m.index != null && m.index > 40) {
      end = Math.min(end, m.index);
    }
  }

  let scope = body.slice(0, end).trim();

  // Safety: if still huge, cut at first clear next major heading after ~200 chars
  if (scope.length > 3500) {
    const late = scope.slice(200).search(/\n\s*\d+(?:\.\d+)*\s+[A-Z]/);
    if (late >= 0) scope = scope.slice(0, 200 + late).trim();
  }

  return scope;
}

/** Short card blurb for store listing (scope only, truncated). */
export function scopePreviewBlurb(scopeEn: string, max = 420): string {
  const scope = extractClause1ScopeOnly(scopeEn);
  if (scope.length <= max) return scope;
  return scope.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
