/**
 * Turn a machine-readable standard into one assessable row per requirement and test.
 * Standards differ, so this walks the stored document rather than a fixed clause list.
 */

export type AssessmentDraft = {
  itemKey: string;
  section: string;
  clause: string;
  heading: string;
  text: string;
  testMethod: string;
  kind: "clause" | "table";
  sortOrder: number;
};

type MachineLike = {
  fullText?: string;
  requirements?: Array<{ id?: string; clause?: string; text?: string }>;
  /** Clauses an admin added after the machine pack skipped them. Always included. */
  manualRequirements?: Array<{
    id?: string;
    clause?: string;
    heading?: string;
    text?: string;
    testMethod?: string;
    kind?: "clause" | "table";
    section?: string;
  }>;
  clauses?: Array<{ number?: string; title?: string; body?: string }>;
  standard?: { designation?: string };
};

const SKIP_TITLE =
  /^(scope|normative references?|terms and definitions|foreword|introduction|bibliography|contents)$/i;

function furniture(line: string, designation: string) {
  const own = designation.replace(/\s+/g, " ").replace(/:.*/, "").trim();
  const header = own
    ? new RegExp(`^${own.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(?::\\d{2,4})?(?:\\s*\\([A-Z]\\))?$`, "i").test(line)
    : false;
  return (
    header ||
    /^©/.test(line) ||
    /all rights reserved/i.test(line) ||
    /^table of contents$/i.test(line)
  );
}

function isClauseNo(line: string) {
  if (/^[A-Z](?:\.\d+)+$/.test(line)) return true;
  if (!/^\d+(?:\.\d+)*$/.test(line)) return false;
  if (/\.0+$/.test(line)) return false;
  if (/^\d{3,}$/.test(line)) return false;
  return true;
}

function isLimit(line: string) {
  return /^(absent|present|\d+(?:\.\d+)?)$/i.test(line);
}

function isAnnex(line: string) {
  return /^Annex\s+[A-Z]$/i.test(line);
}

function isTableStart(line: string) {
  return /^Table\s+\d+\b/i.test(line);
}

function isRoman(line: string) {
  return /^(i{1,3}|iv|v|vi{0,3}|ix|x)\.?$/i.test(line.replace(/\s/g, ""));
}

function looksLikeTitle(line: string) {
  if (!line || line.length > 110) return false;
  if (isTableStart(line) || isAnnex(line) || /^©/.test(line)) return false;
  if (/^[a-z(]/.test(line)) return false;
  return /[A-Za-z]/.test(line);
}

function methodOf(text: string) {
  const refs = text.match(/\b((?:ISO|ARS|CXS|EAS|IEC)\s*[\d:.-]+|Annex\s+[A-Z])\b/g) || [];
  return [...new Set(refs.map((s) => s.replace(/\s+/g, " ")))].join(", ");
}

function splitLetters(body: string): Array<{ letter: string; text: string }> | null {
  const parts = body
    .split(/\n(?=(?:\(?[a-z]\)|[a-z]\)))\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const rows: Array<{ letter: string; text: string }> = [];
  for (const part of parts) {
    const m = part.match(/^(?:\(([a-z])\)|([a-z])\))\s*([\s\S]+)/);
    if (!m) continue;
    rows.push({ letter: (m[1] || m[2]).toLowerCase(), text: m[3].replace(/\s+/g, " ").trim() });
  }
  return rows.length >= 2 ? rows : null;
}

function parseTable(lines: string[], start: number, clause: string) {
  const title = lines[start].replace(/\s+/g, " ").trim();
  let i = start + 1;
  const headerWords = /^(s\/n|parameter|requirement|test method|micro-organism|limit)$/i;
  while (i < lines.length && (lines[i] === "" || headerWords.test(lines[i]))) i++;

  const rows: Array<{ parameter: string; limit: string; method: string }> = [];
  while (i < lines.length) {
    if (lines[i] === "") {
      i++;
      continue;
    }
    if (isClauseNo(lines[i]) || isAnnex(lines[i]) || isTableStart(lines[i]) || /^bibliography$/i.test(lines[i])) {
      break;
    }
    if (!isRoman(lines[i])) break;
    i++;
    while (i < lines.length && lines[i] === "") i++;
    const parameterLines: string[] = [];
    while (i < lines.length && lines[i] && !isLimit(lines[i]) && !isRoman(lines[i]) && !isTableStart(lines[i]) && !isAnnex(lines[i])) {
      if (isClauseNo(lines[i]) && looksLikeTitle(lines[i + 1] || "")) break;
      parameterLines.push(lines[i]);
      i++;
    }
    if (!parameterLines.length || i >= lines.length || !isLimit(lines[i])) break;
    const limit = lines[i];
    i++;
    while (i < lines.length && lines[i] === "") i++;
    const method = lines[i] && !isRoman(lines[i]) && !isClauseNo(lines[i]) ? lines[i] : "";
    if (method) i++;
    const parameter = parameterLines.join(" ").replace(/\s+/g, " ").trim();
    if (!parameter) break;
    rows.push({ parameter, limit, method });
  }
  return { title, rows, next: i, clause };
}

/** Numeric clause order: 4.1.2 before 4.1.10, 4.1.2(a) after 4.1.2, annexes after the body. */
export function clauseRank(clause: string): number[] | null {
  const raw = clause.trim();
  const numbered = raw.match(/^(\d+(?:\.\d+)*)(?:\s*\(?([a-z])\)?)?/i);
  if (numbered && /^\d/.test(raw)) {
    const nums = numbered[1].split(".").map((part) => Number(part));
    if (numbered[2]) nums.push(numbered[2].toLowerCase().charCodeAt(0));
    return nums;
  }
  const annex = raw.match(/^annex\s+([a-z])(?:\.(\d+(?:\.\d+)*))?(?:\s*\(?([a-z])\)?)?/i);
  if (annex) {
    const nums = [10000 + (annex[1].toUpperCase().charCodeAt(0) - 64)];
    if (annex[2]) nums.push(...annex[2].split(".").map((part) => Number(part)));
    if (annex[3]) nums.push(annex[3].toLowerCase().charCodeAt(0));
    return nums;
  }
  const annexSub = raw.match(/^([A-Z])\.(\d+(?:\.\d+)*)(?:\s*\(?([a-z])\)?)?$/);
  if (annexSub) {
    const nums = [10000 + (annexSub[1].charCodeAt(0) - 64), ...annexSub[2].split(".").map((part) => Number(part))];
    if (annexSub[3]) nums.push(annexSub[3].toLowerCase().charCodeAt(0));
    return nums;
  }
  return null;
}

function compareRanks(left: number[], right: number[]) {
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    const a = left[i] ?? -1;
    const b = right[i] ?? -1;
    if (a !== b) return a - b;
  }
  return 0;
}

/** Index where `clause` belongs among existing clause numbers. Unnumbered rows are left in place. */
export function clauseInsertIndex(clauses: string[], clause: string) {
  const key = clauseRank(clause);
  if (!key) return clauses.length;
  const numeric = key[0] < 10000;
  for (let i = 0; i < clauses.length; i++) {
    const existing = clauseRank(clauses[i]);
    if (!existing) continue;
    if (numeric && existing[0] >= 10000) continue;
    if (compareRanks(existing, key) > 0) return i;
  }
  return clauses.length;
}

export function extractAssessmentDrafts(machine: MachineLike): AssessmentDraft[] {
  const fullText = machine.fullText || "";
  const designation = machine.standard?.designation || "";
  const lines = fullText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !furniture(l, designation));

  type Clause = { clause: string; title: string; body: string[] };
  const clauses: Clause[] = [];
  const tables: Array<{ clause: string; title: string; rows: Array<{ parameter: string; limit: string; method: string }> }> = [];

  let i = 0;
  let current: Clause | null = null;
  let normative = false;

  function pushCurrent() {
    if (current) clauses.push(current);
    current = null;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    if (/^bibliography$/i.test(line)) break;

    if (isTableStart(line)) {
      const table = parseTable(lines, i, current?.clause || "");
      if (table.rows.length) tables.push({ clause: table.clause, title: table.title, rows: table.rows });
      i = table.next;
      continue;
    }

    if (isAnnex(line)) {
      pushCurrent();
      const annex = line.replace(/\s+/g, " ");
      let j = i + 1;
      if (lines[j] && /^\((normative|informative)\)$/i.test(lines[j])) j++;
      const title = looksLikeTitle(lines[j] || "") ? lines[j] : annex;
      if (looksLikeTitle(lines[j] || "")) j++;
      current = { clause: annex, title, body: [] };
      normative = true;
      i = j;
      continue;
    }

    if (isClauseNo(line) && looksLikeTitle(lines[i + 1] || "") && !/^(ISO|ARS|IEC|CXS|EAS|Annex)\b/i.test(lines[i + 1] || "")) {
      const title = lines[i + 1];
      const number = line;
      const startNormative = /^4$/.test(number) || /requirement/i.test(title);
      if (startNormative) normative = true;
      if (normative && !SKIP_TITLE.test(title)) {
        pushCurrent();
        current = { clause: number, title, body: [] };
      } else {
        pushCurrent();
      }
      i += 2;
      continue;
    }

    if (current) current.body.push(line);
    i++;
  }
  pushCurrent();

  const drafts: AssessmentDraft[] = [];
  let order = 0;
  const seen = new Set<string>();

  function add(draft: Omit<AssessmentDraft, "sortOrder">) {
    if (seen.has(draft.itemKey)) return;
    seen.add(draft.itemKey);
    drafts.push({ ...draft, sortOrder: order++ });
  }

  for (const clause of clauses) {
    const body = clause.body.join("\n").trim();
    const section = `${clause.clause} ${clause.title}`.replace(/\s+/g, " ").trim();
    const letters = splitLetters(body);
    if (letters) {
      for (const row of letters) {
        add({
          itemKey: `clause:${clause.clause}:${row.letter}`,
          section,
          clause: `${clause.clause}(${row.letter})`,
          heading: clause.title,
          text: row.text,
          testMethod: methodOf(row.text),
          kind: "clause",
        });
      }
    } else if (body || /shall/i.test(clause.title)) {
      const text = (body || clause.title).replace(/\s+/g, " ").trim();
      add({
        itemKey: `clause:${clause.clause}`,
        section,
        clause: clause.clause,
        heading: body ? clause.title : clause.clause,
        text,
        testMethod: methodOf(text),
        kind: "clause",
      });
    }
  }

  for (const table of tables) {
    table.rows.forEach((row, index) => {
      add({
        itemKey: `table:${table.clause}:${index}:${row.parameter.slice(0, 40)}`,
        section: table.clause ? `${table.clause} · ${table.title}` : table.title,
        clause: table.clause,
        heading: row.parameter,
        text: row.limit,
        testMethod: row.method,
        kind: "table",
      });
    });
  }

  if (drafts.length === 0) {
    const fallback = machine.requirements?.length
      ? machine.requirements
      : (machine.clauses || []).map((c) => ({
          id: c.number,
          clause: c.number,
          text: `${c.title || ""}\n${c.body || ""}`.trim(),
        }));

    fallback.forEach((row, index) => {
      const text = String(row.text || "").trim();
      if (!text) return;
      add({
        itemKey: `fallback:${row.id || row.clause || index}`,
        section: "Standard requirements",
        clause: String(row.clause || ""),
        heading: "Requirement",
        text,
        testMethod: methodOf(text),
        kind: "clause",
      });
    });

    if (drafts.length === 0 && fullText.trim()) {
      add({
        itemKey: "fallback:full",
        section: "Standard text",
        clause: "",
        heading: machine.standard?.designation || "Standard",
        text: fullText.trim(),
        testMethod: "",
        kind: "clause",
      });
    }
  }

  const manuals: AssessmentDraft[] = [];
  for (const row of machine.manualRequirements || []) {
    const text = String(row.text || "").trim();
    const heading = String(row.heading || "").trim();
    if (!text && !heading) continue;
    const clause = String(row.clause || "").trim();
    const kind = row.kind === "table" ? "table" : "clause";
    const itemKey = `manual:${row.id || clause || heading.slice(0, 24)}`;
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    const title = heading || text;
    manuals.push({
      itemKey,
      section: `${clause} ${title}`.replace(/\s+/g, " ").trim() || title,
      clause,
      heading: heading || (kind === "table" ? clause || "Requirement" : ""),
      text: text || heading,
      testMethod: String(row.testMethod || "").trim() || methodOf(`${heading} ${text}`),
      kind,
      sortOrder: 0,
    });
  }
  manuals.sort((a, b) => {
    const left = clauseRank(a.clause);
    const right = clauseRank(b.clause);
    if (left && right) return compareRanks(left, right);
    return a.clause.localeCompare(b.clause);
  });
  for (const manual of manuals) {
    const idx = clauseInsertIndex(
      drafts.map((draft) => draft.clause),
      manual.clause,
    );
    drafts.splice(idx, 0, manual);
  }
  drafts.forEach((draft, index) => {
    draft.sortOrder = index;
  });

  return drafts;
}
