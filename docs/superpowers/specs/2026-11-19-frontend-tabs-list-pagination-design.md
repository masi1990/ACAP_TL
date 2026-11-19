# Frontend tabs, list search & pagination — design

Date: 2026-11-19  
Status: Approved for implementation planning  
Scope: Long multi-section pages (in-page tabs) + every frontend list (global search, Clear, LinePager) with server paging for large domains  
Codebase: `ACAP_TL/ACAP_TL`

## Problem

Many admin and portal pages stack multiple sections into one long scroll. Separately, many frontend lists render unbounded (or effectively unbounded) arrays with no consistent search or pagination, so pages become hard to scan as data grows.

## Goals

1. Split **long multi-section pages** with `DeskTabs` so the first viewport stays short.
2. Give **every frontend list**: one global search box (matches any visible column), a **Clear** control, `LinePager` (Prev / Page N of M / Next, page size **20**), and a result count.
3. **Avoid unbounded loads** for large domains: those lists use server `skip`/`take` + `q` (or existing paged APIs) in this pass.

## Non-goals

- New DataTable framework or per-column filter inputs.
- Retabbing desks that already use `DeskTabs` well (public Library, CB, Customs/Inspect, Analytics, Admin Standards, Admin Health).
- Adding tabs to short CRUD pages (RECs, Sectors, Prices, Consumers, Admin Overview).
- Unrelated schema/entity redesign (read-path `q` / page query params are in scope; entity file / DB schema changes need explicit confirmation if they become necessary).

## Approach

**Shared list chrome + page-level DeskTabs**, with **server paging on large lists** in the same pass (Approach 1 + risk reduction).

Reuse existing primitives; add one thin toolbar component; retrofit lists and long pages incrementally.

## Information architecture — tabs

Use existing `DeskTabs` (`src/app/[locale]/cb/desk-tabs.tsx`). Prefer `keepMounted` where forms must survive tab switches. Nested tabs leave `syncHash={false}` to the outer list (same as Library Catalogue).

| Page | Proposed tabs |
|------|----------------|
| Admin Library | Notify CC · Access · Standard requests · Activity |
| Roles & RBAC | Roles · Assign · Assignments |
| Institutions | Create · Grants · By country |
| Import PDF/Word | Upload · Details · Languages (or natural wizard steps) |
| Manufacturers | Create · Directory |
| Copied marks (admin) | Marks · Relist requests |
| Lookup | Single sticky search form; if multiple result kinds stack, tab **Results** kinds only (do not tab away the search form) |
| Store | Browse with toolbar + pager (cart/actions stay on the same tab if short) |
| Registry | Browse with toolbar + pager |
| Surveillance | New case · Open cases · Related |
| Verify | Verify · Result |

Admin route-level `NavTabs` in `admin-chrome` stay as they are. Public header nav stays route-level; this work is **in-page** only.

## List UX

### Shared `ListToolbar`

New component (e.g. `src/components/list-toolbar.tsx`):

- Text input (placeholder appropriate to the list)
- **Clear** button: disabled when `q` is empty; clears query and resets page to **1**
- Optional count line: “Showing X–Y of Z” or “N matches”

### Pagination

- Reuse `listPage` / `listHref` / `LIST_PAGE_SIZE` (`src/lib/list-page.ts`) and `LinePager` (`src/components/line-pager.tsx`)
- Page size **20** unless a list already documents a deliberate override (do not introduce new sizes without reason)
- Hide pager when `pageCount <= 1` (existing `LinePager` behavior)

### Search semantics

- One global box above the table (not per-column)
- Case-insensitive substring match across **columns shown** on that list
- Clear empties `q` and resets page to 1
- RSC / link-based lists: `?q=` + `?page=` via `listHref`
- Client desks: local state for `q`/`page`; tab hash unchanged

## Data strategy

### Must server-page in this pass

Do **not** `findMany` the whole domain into the page payload for:

| Surface | Mechanism |
|---------|-----------|
| Catalogue | Server `listPage` + `q` on designation/title (and other visible fields) |
| Store | Same pattern for standards listings |
| Library standards table | Stop loading all holdings into the client; page via holdings/options query with `q` |
| Registry | Keep/extend `page` / `pageSize`; wire global `q` + Clear + `LinePager` |
| CB clients & products tables | Desk-scoped paged queries + toolbar |
| Customs / Inspect product tables | Paged product query + toolbar |
| Admin imported marks | Paged marks (+ relist list if large) |
| Admin library queues / reports | Cap + page request / activity / report tables |
| Surveillance cases | Paged cases list |

### Client filter + pager is OK

Naturally small domains (RECs, sectors, prices, many admin directories once filtered) may filter in memory then `listPage` / `LinePager`, but still get `ListToolbar`.

### Helpers

- Thin shared match helper (e.g. `rowMatchesQuery(row, q, fields)`) for client-side lists
- Server lists: Prisma `where` + `skip`/`take` + `count`; return only the current page of rows

## Components

| Unit | Responsibility |
|------|----------------|
| `DeskTabs` | Existing in-page tabs (reuse) |
| `ListToolbar` | Search + Clear + optional count |
| `LinePager` / `listPage` / `listHref` | Existing paging (reuse) |
| Page/desk clients | Wire tabs; pass filtered/paged rows; keep forms on `keepMounted` tabs |

Prefer extending current page files over a new generic DataTable.

## Rollout order

1. Shared `ListToolbar` + match helper; document wiring for `q` / `page`
2. Admin long pages: Library → Roles → Institutions → Import → Manufacturers → Copied marks
3. Public / desk large lists: Catalogue → Store → Library table → Registry → CB → Customs/Inspect → Surveillance → Verify/Lookup as needed
4. Sweep remaining frontend lists for toolbar + pager where missing
5. Smoke-check: Clear resets page; pager hidden when ≤1 page; empty-state copy; large-list payloads stay bounded

## Error handling & empty states

- No matches: explicit empty copy in the list panel (not a blank table)
- API / query failure on paged lists: visible error; do not clear prior good UI silently mid-type if the request was aborted
- Invalid `page` query: clamp via existing `listPage` behavior

## Testing

- Unit: query match helper; Clear resets page; `listPage` with filtered totals
- Integration / API: large-list endpoints (or RSC loaders) return at most page size rows and honor `q`
- UI smoke: one admin tabbed page; one public paged list; search + Clear + pager; `keepMounted` form survival where used

## Success criteria

- Long target pages use tabs so primary work does not require scrolling past unrelated sections
- Every frontend list has global search, Clear, and LinePager (page size 20) unless the list is a non-tabular one-off (e.g. pure form)
- Catalogue, Store, Library standards, Registry, CB/Customs product tables, admin marks, library queues/reports, and surveillance cases do not load unbounded row arrays into the page
- Existing well-tabbed desks and short CRUD pages are not needlessly redesigned

## Implementation notes

- Preserve ARSO visual language / design tokens; match `DeskTabs` and existing admin form styling
- Do not change entity files or DB schema without explicit confirmation
- Library public Catalogue / Request / Activity tabs from the library redesign remain the reference for tab UX
