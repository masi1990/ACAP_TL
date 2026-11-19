# Frontend Tabs, List Search & Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `DeskTabs` on long multi-section pages and give every frontend list a global search + Clear + `LinePager` (page size 20), with server paging for large domains.

**Architecture:** Reuse `DeskTabs`, `listPage`/`listHref`, and `LinePager`. Add `ListToolbar` + `rowMatchesQuery`. Client-filter small lists; server `skip`/`take` + `q` for Catalogue, Store, Library standards, Registry, CB/Customs tables, admin marks, library queues/reports, surveillance.

**Tech Stack:** Next.js App Router, React client components, Prisma, vitest, existing ARSO CSS variables.

**Spec:** `docs/superpowers/specs/2026-11-19-frontend-tabs-list-pagination-design.md`

## Global Constraints

- Work in `/home/acap/ACAP_TL/ACAP_TL` (nested app root).
- Do **not** change entity/DB schema files without explicit confirmation.
- Do **not** retab public Library, CB, Customs/Inspect, Analytics, Admin Standards, Admin Health.
- Do **not** add tabs to short CRUD (RECs, Sectors, Prices, Consumers, Overview) — search + pager only.
- Page size **20** via `LIST_PAGE_SIZE` unless an existing deliberate override.
- Preserve ARSO tokens (`--ink`, `--line`, `--muted`, `--surface`, `--accent`).
- Tests: `npm test` (vitest), focused files under `tests/`.
- Commits: small, one task each; never commit `.env` or uploaded PDFs.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/list-query.ts` | `rowMatchesQuery`, `normalizeListQuery` |
| `src/components/list-toolbar.tsx` | Search input + Clear + optional count |
| `src/app/[locale]/admin/library/library-admin-client.tsx` | DeskTabs + list toolbars |
| `src/app/[locale]/admin/roles/roles-admin-client.tsx` | DeskTabs + list toolbars |
| `src/app/[locale]/admin/institutions/page.tsx` (+ related) | DeskTabs + toolbars |
| `src/app/[locale]/admin/standards/import/page.tsx` | DeskTabs wizard sections |
| `src/app/[locale]/admin/manufacturers/page.tsx` | DeskTabs + directory toolbar |
| `src/app/[locale]/admin/imported-marks/page.tsx` | DeskTabs + server/client paging |
| `src/lib/catalogue-list.ts` + `catalogue/page.tsx` | Server page + `q` + LinePager |
| Store / library table / registry / CB / customs / surveillance | Server or client page + toolbar |
| Remaining admin/public lists | Sweep toolbar + pager |
| `tests/list-query.test.ts` | Match helper unit tests |

---

### Task 1: Shared list query helper + ListToolbar

**Files:**
- Create: `src/lib/list-query.ts`
- Create: `src/components/list-toolbar.tsx`
- Test: `tests/list-query.test.ts`

**Interfaces:**
- Produces:
  - `normalizeListQuery(q: string | null | undefined): string` — trim; empty → `""`
  - `rowMatchesQuery(row: Record<string, unknown> | object, q: string, fields: string[]): boolean` — if `q` empty return true; else case-insensitive substring on stringified field values (skip null/undefined)
  - `ListToolbar(props: { value: string; onChange: (q: string) => void; onClear: () => void; placeholder?: string; from?: number; to?: number; total?: number; className?: string })`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { normalizeListQuery, rowMatchesQuery } from "../src/lib/list-query";

describe("normalizeListQuery", () => {
  it("trims and maps empty to empty string", () => {
    expect(normalizeListQuery("  ab  ")).toBe("ab");
    expect(normalizeListQuery("   ")).toBe("");
    expect(normalizeListQuery(undefined)).toBe("");
  });
});

describe("rowMatchesQuery", () => {
  const row = { designation: "ARS 100", title: "Butter", sector: "Food" };

  it("matches empty query", () => {
    expect(rowMatchesQuery(row, "", ["designation", "title"])).toBe(true);
  });

  it("matches any listed field case-insensitively", () => {
    expect(rowMatchesQuery(row, "butter", ["designation", "title"])).toBe(true);
    expect(rowMatchesQuery(row, "ARS", ["designation", "title"])).toBe(true);
    expect(rowMatchesQuery(row, "food", ["designation", "title"])).toBe(false);
    expect(rowMatchesQuery(row, "food", ["designation", "title", "sector"])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/list-query.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper + ListToolbar**

`src/lib/list-query.ts`:

```ts
export function normalizeListQuery(q: string | null | undefined): string {
  return String(q ?? "").trim();
}

export function rowMatchesQuery(
  row: Record<string, unknown> | object,
  q: string,
  fields: string[],
): boolean {
  const needle = normalizeListQuery(q).toLowerCase();
  if (!needle) return true;
  const record = row as Record<string, unknown>;
  return fields.some((field) => {
    const value = record[field];
    if (value == null) return false;
    return String(value).toLowerCase().includes(needle);
  });
}
```

`src/components/list-toolbar.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

export function ListToolbar({
  value,
  onChange,
  onClear,
  placeholder = "Search",
  from,
  to,
  total,
  className,
}: {
  value: string;
  onChange: (q: string) => void;
  onClear: () => void;
  placeholder?: string;
  from?: number;
  to?: number;
  total?: number;
  className?: string;
}) {
  const hasQuery = value.trim().length > 0;
  const count =
    typeof total === "number"
      ? typeof from === "number" && typeof to === "number" && total > 0
        ? `Showing ${from}–${to} of ${total}`
        : `${total} match${total === 1 ? "" : "es"}`
      : null;

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
        <span className="text-[var(--muted)]">Search</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <button
        type="button"
        disabled={!hasQuery}
        onClick={onClear}
        className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm disabled:opacity-40"
      >
        Clear
      </button>
      {count ? <p className="pb-2 text-sm text-[var(--muted)]">{count}</p> : null}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/list-query.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/list-query.ts src/components/list-toolbar.tsx tests/list-query.test.ts
git commit -m "Add ListToolbar and shared list query helper."
```

---

### Task 2: Admin Library — DeskTabs + list toolbars

**Files:**
- Modify: `src/app/[locale]/admin/library/library-admin-client.tsx`
- Modify: `src/app/[locale]/admin/library/page.tsx` (paged activity/requests if still unbounded)

**Interfaces:**
- Consumes: `DeskTabs`, `ListToolbar`, `rowMatchesQuery`, `listPage`, `LinePager`
- Tabs: `notify` · `access` · `standard-requests` · `activity` with `keepMounted`

- [ ] **Step 1: Wrap stacked sections in DeskTabs**

Import `DeskTabs` from `../../cb/desk-tabs` (same relative pattern as other admin pages that use it — prefer `@/app/[locale]/cb/desk-tabs` if path alias works, else relative).

Structure:

```tsx
<DeskTabs
  keepMounted
  tabs={[
    { id: "notify", label: "Notify CC", content: (/* notify form or read-only note */) },
    { id: "access", label: "Access", content: (/* create login + role requests list */) },
    { id: "standard-requests", label: "Standard requests", content: (/* standard request forms */) },
    { id: "activity", label: "Activity", content: (/* filters + activity + audits */) },
  ]}
/>
```

Keep existing forms/handlers; only restructure layout. Title/error/message stay above tabs.

- [ ] **Step 2: Add ListToolbar + LinePager on request/activity lists**

For role requests, standard requests, activity, audits: local `q`/`page` state (or per-tab), filter with `rowMatchesQuery` on visible text fields, page with `listPage(String(page), filtered.length)`, render `ListToolbar` + `LinePager` with `onPage`.

- [ ] **Step 3: Manual smoke** — open `/en/admin/library`, switch tabs, search/clear/page on Activity.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/admin/library/library-admin-client.tsx src/app/[locale]/admin/library/page.tsx
git commit -m "Tab admin Library and paginate its lists."
```

---

### Task 3: Roles & RBAC — DeskTabs + list toolbars

**Files:**
- Modify: `src/app/[locale]/admin/roles/roles-admin-client.tsx`

**Interfaces:**
- Tabs: `roles` · `assign` · `assignments` with `keepMounted`
- Consumes: `DeskTabs`, `ListToolbar`, `rowMatchesQuery`, `listPage`, `LinePager`

- [ ] **Step 1: Split editor / create / assign / assignment tables into the three tabs** (Roles = editor+create; Assign = assign form; Assignments = tables).
- [ ] **Step 2: Toolbar + pager on any assignment/role tables.**
- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/admin/roles/roles-admin-client.tsx
git commit -m "Tab Roles admin and paginate assignment lists."
```

---

### Task 4: Institutions — DeskTabs + list toolbars

**Files:**
- Modify: `src/app/[locale]/admin/institutions/page.tsx`
- Modify related section components as needed (`grant-rights-form.tsx`, `institution-accounts.tsx`, `institution-requests.tsx`, `country-recs.tsx`)

**Interfaces:**
- Tabs: `create` · `grants` · `by-country`
- Lists: toolbar + pager (client ok for small; keep any existing `listPage` wiring and add `q`)

- [ ] **Step 1: Wrap page sections in DeskTabs (`keepMounted` for forms).**
- [ ] **Step 2: Ensure each table has ListToolbar + LinePager.**
- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/admin/institutions/
git commit -m "Tab Institutions admin and add list search/pager."
```

---

### Task 5: Import PDF/Word + Manufacturers + Copied marks

**Files:**
- Modify: `src/app/[locale]/admin/standards/import/page.tsx`
- Modify: `src/app/[locale]/admin/manufacturers/page.tsx`
- Modify: `src/app/[locale]/admin/imported-marks/page.tsx`

**Interfaces:**
- Import tabs: `upload` · `details` · `languages` (map existing wizard fields into these panels; `keepMounted`)
- Manufacturers: `create` · `directory` + toolbar/pager on directory
- Copied marks: `marks` · `relist` + **server or client page** marks list (must not dump unbounded marks without pager); prefer Prisma `skip`/`take` + `q` if list can grow large

- [ ] **Step 1: Import page DeskTabs.**
- [ ] **Step 2: Manufacturers DeskTabs + directory ListToolbar/LinePager.**
- [ ] **Step 3: Copied marks DeskTabs + paged searchable marks (+ relist).**
- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/admin/standards/import/page.tsx src/app/[locale]/admin/manufacturers/page.tsx src/app/[locale]/admin/imported-marks/page.tsx
git commit -m "Tab Import, Manufacturers, and Copied marks with list paging."
```

---

### Task 6: Catalogue + Store — server paging + search chrome

**Files:**
- Modify: `src/lib/catalogue-list.ts` (or equivalent)
- Modify: `src/app/[locale]/catalogue/page.tsx`
- Modify: `src/app/[locale]/store/page.tsx` and/or `store-client.tsx`

**Interfaces:**
- Catalogue: accept `page` in `searchParams`; return `{ rows, total }` with `skip`/`take` = `LIST_PAGE_SIZE`; keep filters; add Clear (link or button resetting `q` and page) + `LinePager` via `listHref` preserving other query keys
- Store: page standards listings the same way; ListToolbar or existing search wired to `q` + Clear + LinePager

- [ ] **Step 1: Change catalogue loader to return paged rows + total (never full array to the table).**
- [ ] **Step 2: Wire catalogue UI Clear + LinePager.**
- [ ] **Step 3: Store browse paged + search Clear + LinePager.**
- [ ] **Step 4: Commit**

```bash
git add src/lib/catalogue-list.ts src/app/[locale]/catalogue/page.tsx src/app/[locale]/store/
git commit -m "Server-page Catalogue and Store listings with search pager."
```

---

### Task 7: Library standards table + Registry — server/API paging

**Files:**
- Modify: `src/app/[locale]/library/library-standards-table.tsx` (+ holdings loader / options API as needed)
- Modify: `src/app/[locale]/registry/registry-client.tsx` (+ `src/lib/registry.ts` / API if needed)

**Interfaces:**
- Library table: replace load-more-all with page size 20 + ListToolbar + LinePager; fetch/page server-side or page a capped query — do not keep full ~3000 rows in client if avoidable
- Registry: wire global `q` + Clear + LinePager on existing `page`/`pageSize` API (normalize pageSize to 20 if currently 12, **or** keep 12 only if documented — prefer **20** per spec)

- [ ] **Step 1: Library standards ListToolbar + LinePager + bounded fetch.**
- [ ] **Step 2: Registry ListToolbar + Clear + LinePager (page size 20).**
- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/library/ src/app/[locale]/registry/ src/lib/registry.ts
git commit -m "Page Library standards and Registry with search toolbar."
```

---

### Task 8: CB products/clients + Customs/Inspect + Surveillance + Verify/Lookup

**Files:**
- Modify: `src/app/[locale]/cb/page.tsx` (list panels only — do not retab)
- Modify: `src/app/[locale]/customs/customs-desk.tsx` (list panels only)
- Modify: `src/app/[locale]/surveillance/page.tsx` + `surveillance-client.tsx`
- Modify: `src/app/[locale]/verify/page.tsx` as needed
- Modify: `src/app/[locale]/lookup/page.tsx` (sticky search; tab result kinds only if stacked)

**Interfaces:**
- Add ListToolbar + LinePager; server-page product/client/case queries where lists are large
- Surveillance tabs: `new` · `cases` · `related`
- Verify tabs: `verify` · `result` if result stack is long; else sticky form + result below is OK if short

- [ ] **Step 1: CB client/product tables toolbar + pager (paged query).**
- [ ] **Step 2: Customs/Inspect product tables toolbar + pager.**
- [ ] **Step 3: Surveillance tabs + paged cases.**
- [ ] **Step 4: Verify/Lookup polish per spec.**
- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/cb/page.tsx src/app/[locale]/customs/customs-desk.tsx src/app/[locale]/surveillance/ src/app/[locale]/verify/page.tsx src/app/[locale]/lookup/page.tsx
git commit -m "Add list search/pager to CB, Customs, Surveillance, Verify, Lookup."
```

---

### Task 9: Sweep remaining frontend lists

**Files:**
- Modify any remaining list UIs missing toolbar/pager, including: `admin/recs`, `admin/sectors`, `admin/prices`, `admin/tariffs`, `admin/orders`, `admin/audit`, `admin/library/reports`, `consumers` (if list), `trade` tables, etc.

**Rule:** Every tabular list gets `ListToolbar` (or equivalent `q` + Clear) + `LinePager` unless it is a non-list form. Short domains may client-filter.

- [ ] **Step 1: Grep for `.map(` table bodies without LinePager; fix gaps.**
- [ ] **Step 2: Ensure Clear resets page to 1 everywhere.**
- [ ] **Step 3: Commit**

```bash
git add -u src/app src/components src/lib
git commit -m "Sweep remaining frontend lists for search and pagination."
```

---

### Task 10: Verification

- [ ] **Step 1: Run `npm test -- tests/list-query.test.ts` and any new list tests — PASS**
- [ ] **Step 2: Spot-check RSC payloads / queries for Catalogue/Store/Library/Registry — page-sized rows only**
- [ ] **Step 3: Smoke: admin Library tabs; Catalogue search Clear + pager; one CB/Customs list**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| DeskTabs on long pages | 2–5, 8 |
| ListToolbar search + Clear | 1+ |
| LinePager page size 20 | 1+ |
| Server-page large lists | 5–8 |
| No retab of already-good desks | Constraints |
| No schema without confirmation | Constraints |
| Unit tests for match helper | 1 |
