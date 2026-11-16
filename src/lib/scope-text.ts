/**
 * Public surfaces may only expose Clause 1 Scope.
 * Machine packs still retain the full document separately.
 * Headings are recognized in the languages ARSO publishes: English, French,
 * Portuguese, and Arabic.
 */

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’ʼ`]/g, "'");
}

const SCOPE_HEADINGS = [
  "scope",
  "champ d'application",
  "domaine d'application",
  "objet et domaine d'application",
  "campo de aplicacao",
  "objetivo e campo de aplicacao",
  "objectivo e campo de aplicacao",
  "objecto e campo de aplicacao",
  "ambito de aplicacao",
  "ambito",
];

const ARABIC_SCOPE_HEADINGS = ["نطاق التطبيق", "مجال التطبيق", "المجال"];

const ARABIC_HINTS = [
  "المجال",
  "نطاق التطبيق",
  "مجال التطبيق",
  "المراجع المعيارية",
  "المراجع القياسية",
  "تحدد",
  "يحدد",
  "تختص",
  "المصطلحات",
  "التعاريف",
  "المحتويات",
  "الفهرس",
  "هذه المواصفة",
  "التعبئة",
  "الوسم",
];

function arabicRatio(text: string) {
  const letters = [...text].filter((ch) => /\p{L}/u.test(ch));
  if (!letters.length) return 0;
  return letters.filter((ch) => /[\u0600-\u06FF\uFE70-\uFEFF]/u.test(ch)).length / letters.length;
}

function hintScore(text: string) {
  return ARABIC_HINTS.reduce((n, hint) => n + (text.includes(hint) ? hint.length : 0), 0);
}

/** Logical Arabic uses the definite article ال at the start of words. Visual order rarely does. */
function articleScore(text: string) {
  return text
    .replace(/[أإآ]/g, "ا")
    .split(/\s+/)
    .filter((word) => {
      const bare = word.replace(/^[وفس]/, "");
      return bare.startsWith("ال") && [...bare].length >= 4;
    }).length;
}

/** Flip Arabic lines that a PDF extractor returned in visual order. Latin lines stay as they are. */
export function logicalStandardText(text: string) {
  return text
    .split("\n")
    .map((line) => {
      if (arabicRatio(line) < 0.6) return line;
      const key = line.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "");
      const rev = [...key].reverse().join("");
      const keyScore = hintScore(key) * 10 + articleScore(key);
      const revScore = hintScore(rev) * 10 + articleScore(rev);
      if (revScore > keyScore) return rev;
      if (keyScore > revScore) return key;
      return /[\uFE70-\uFEFF]/.test(line) ? rev : key;
    })
    .join("\n");
}

function isTocLine(line: string) {
  return /\.{3,}|…/.test(line) || /\s{4,}\d+\s*$/.test(line);
}

function isScopeHeadingLine(line: string) {
  const raw = logicalStandardText(line).trim();
  const compact = raw.replace(/^\d+(?:\.\d+)*[\s.]*/, "").replace(/[\s.]*\d+(?:\.\d+)*$/, "").trim();
  if (!compact || isTocLine(raw)) return false;
  if (ARABIC_SCOPE_HEADINGS.some((heading) => compact === heading || compact.startsWith(`${heading} `))) {
    return true;
  }
  const folded = fold(compact);
  return SCOPE_HEADINGS.some((heading) => folded === heading || folded.startsWith(`${heading} `));
}

function hasSpecifyingSentence(text: string) {
  const logical = logicalStandardText(text);
  return /specifie|\bespecifica\b|aplica-se|\bestabelece\b/.test(fold(logical)) || /تحدد|يحدد|تختص/.test(logical);
}

/** Index where clause 2 begins, relative to `body`, or null when it is not present. */
function clause2Cut(body: string): number | null {
  const specific =
    /\n\s*2(?:\.0)?\.?\s*[\s.]*(?:normative\s+references?|r[eé]f[eé]rences\s+normatives|refer[eê]ncias\s+normativas|المراجع\s+المعيارية|المراجع\s+القياسية)(?!\p{L})/iu;
  const sameLine = /\n\s*2(?:\.0)?\.?\s+[A-ZÀ-Ý\u0600-\u06FF]/;
  const stacked = /\n\s*2(?:\.0)?\.?\s*\n+\s*[A-ZÀ-Ý\u0600-\u06FF]/;
  let end: number | null = null;
  for (const re of [specific, sameLine, stacked]) {
    const match = body.match(re);
    if (match && match.index != null && match.index > 40 && !isTocLine(match[0])) {
      end = end == null ? match.index : Math.min(end, match.index);
    }
  }
  return end;
}

/** Cut text at the start of clause 2 (or the next top-level clause after 1). */
export function extractClause1ScopeOnly(text: string): string {
  const raw = logicalStandardText((text || "").replace(/\r\n/g, "\n")).trim();
  if (!raw) return "";

  const lines = raw.split("\n");
  let startLine = -1;
  let bestScore = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!isScopeHeadingLine(line)) continue;
    const following = lines.slice(i, i + 14).join("\n");
    const score = (hasSpecifyingSentence(following) ? 100 : 40) + i / 1000;
    if (score >= bestScore) {
      bestScore = score;
      startLine = i;
    }
  }

  const body = startLine >= 0 ? lines.slice(startLine).join("\n") : raw;
  const end = clause2Cut(body);
  let scope = (end != null ? body.slice(0, end) : body).trim();

  // Safety: if still huge, cut at the first clear next major heading after ~200 chars
  if (scope.length > 3500) {
    const late = scope.slice(200).search(/\n\s*\d+(?:\.\d+)*\s+\p{L}/u);
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
