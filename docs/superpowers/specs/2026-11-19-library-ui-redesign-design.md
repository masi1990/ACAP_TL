# Library UI redesign — design

Date: 2026-11-19  
Status: Approved for implementation planning  
Scope: Public library page UX, request flow (including not-listed / missing-text), request email CC, admin library reports  
Codebase: `ACAP_TL/ACAP_TL` (route `/[locale]/library`, live `/arso/en/library`)

## Problem

The library page stacks holdings, “Request particular standards”, and “Your activity” on one long scroll. Sector navigation is a dense pill row with weak expand/collapse cues. With ~17 sectors, 100+ technical committees, and ~3000 standards — and growth as new standardisation areas appear — the UI is hard to scan and filter. Officers also need to request standards that are not in the catalogue, or that are listed but have no text/file, and ARSO needs admin visibility into those gaps.

## Goals

1. Clear top-level tabs so request and activity are not competing with browsing.
2. Scalable Browse: sidebar sector → TC tree, search, and filters (sector, TC, category).
3. Clear expand/collapse affordances on sector and TC containers.
4. Improved Analysis: summary cards, category breakdown, per-sector bars — data-driven so new sectors/TCs appear without UI hardcoding.
5. Request tab: browse/add known standards + “Other / not listed” free text; allow requesting catalogue items with no file (flagged).
6. On request notification email: CC the requestor.
7. Admin reports page: standards with no text; standards with no text that have been requested.

## Non-goals

- Changing library RBAC or release-token download semantics.
- Rebuilding admin library account/role workflows (beyond linking to the new reports page).
- Full-text search of PDF content.
- Hardcoding sector or TC lists in the UI.

## Approach

**Shared catalogue shell + thin page tabs** (Approach 1).

One reusable catalogue (sidebar + filters + table + analysis). Page-level tabs wrap it for Catalogue / Request / Activity. Admin gets a separate reports route.

## Information architecture

### Top-level tabs (`/[locale]/library`)

| Tab | Who sees it | Contents |
|-----|-------------|----------|
| **Catalogue** | Everyone | Sub-tabs **Browse** · **Analysis**. Officers with access: server-loaded holdings with language download actions. Guests / users without releases: same Browse/Analysis shell fed by `/api/library/options` (read-only, no downloads). Request remains the path to ask for access to files. |
| **Request** | Everyone | Contact fields + shared browser in Add mode + selected list + Other / not listed + submit. |
| **Activity** | Signed-in only | Existing activity feed, moved off the main scroll. |

Default: Catalogue → Browse.

### Catalogue → Browse

**Left sidebar** (desktop ~280px; mobile drawer)

- Search filters sectors/TCs by code or name.
- Sector rows: label, count badge, chevron (`aria-expanded`), one sector expanded at a time unless search widens matches.
- Nested TC rows: code, name, standard count, chevron/selection state.
- Selecting a TC (or “all in sector”) drives the main table.
- Entire tree is DB-driven; new sectors/TCs appear automatically.

**Main panel**

- Sticky filter bar: text search (designation/title) · Sector · TC · Category (kind). Synced with sidebar.
- Result count (“Showing X of Y”).
- Table: Designation · Title · Category · File status · actions.
- File status: **No text** when published version has no usable PDF (`sourcePdfUri` / language files empty). Still requestable on Request tab (flagged).
- Load-more / capped pages via the options API (or client paging for holdings). Do not render thousands of rows at once.

### Catalogue → Analysis

1. Summary cards: Sectors · Technical committees · Standards · No-text count.
2. Standards by category: proportional bars/strips with counts (PRODUCT / SERVICE / TESTING / REFERENCE).
3. Per-sector breakdown: header (code, name, TC count, standard count) + bar for standards (category mix secondary). Clicking a sector switches to Browse with that sector selected.

No dense per-TC tables here. Layout must remain readable as sector/TC counts grow (scrollable lists, no fixed N).

### Request tab

- Shared catalogue in **Add** mode (same sidebar, filters, table).
- Selected chips for known standards (removable).
- **Other / not listed**: one or more free-text rows — designation required; optional title/note.
- Submit if ≥1 known standard **or** ≥1 Other row.
- Catalogue rows with No text: Add allowed; item stored with missing-text flag.
- On successful submit: persist request; queue notification to ARSO **and CC the requestor** with known items, Other lines, and missing-text flags listed.

### Activity tab

- Relocate existing “Your activity” list (same data, clearer place). No major redesign in this pass.

## Data model (schema change — confirmed)

`LibraryStandardRequestItem` today requires `standardId`. Extend to support free-text and missing-file signal:

- `standardId` — optional (nullable) when the item is Other / not listed.
- `designationText` (or equivalent) — required when `standardId` is null.
- `titleText` / note field — optional free-text title for Other items.
- `missingText` — boolean (or derived at write time) true when the linked published standard has no usable PDF.

Constraints:

- Exactly one of: linked standard **or** free-text designation.
- Unique constraint on `(requestId, standardId)` only where `standardId` is not null (adjust index accordingly).

**No text** definition for reports and badges: published `StandardVersion` with no usable `sourcePdfUri` and no language-file PDFs.

## API / notifications

- Extend `GET /api/library/options` (or holdings payload) with `hasText` / missing-file per standard (and aggregates if cheap).
- Extend `POST /api/library/standard-requests` to accept Other items and missing-text flags; validate name/email/org/country as today; allow Other-only payloads.
- Today, creating a standard request does not email anyone (admin polls pending rows). Add a **new** notification kind for standard-request receipt: To = configured ARSO library/ops recipients; **CC = requestor email**. Body includes known designations, Other lines, and missing-text markers.
- If email queue fails after DB save: keep request; rely on audit/admin UI (same as other ACAP notify-after-commit patterns). User success message remains tied to successful persist.

## Admin reports

Route: `/[locale]/admin/library/reports`  
Nav: linked from Admin → Library.

Reports:

1. **Standards with no text** — published standards lacking usable PDF; columns: designation, title, sector, TC, updated/created as available.
2. **No text and requested** — subset (or join) of (1) that appear on ≥1 `LibraryStandardRequestItem`, with request count and latest request date.

Purpose: identify gaps for follow-up (e.g. ask the TC to develop or supply the text).

Auth: same as existing admin library (`institutions:write` / `audit:read` or equivalent).

## Components

| Unit | Responsibility |
|------|----------------|
| `LibraryPageShell` | Top tabs; signed-in vs guest Activity visibility |
| `LibraryCatalogue` | Browse / Analysis sub-tabs; filter state |
| `LibrarySidebar` | Searchable sector → TC tree; expand/collapse |
| `LibraryStandardsTable` | Filters, pagination, file badge, row actions |
| `LibraryAnalysis` | Cards, category bars, per-sector bars |
| `StandardRequestForm` | Add-mode catalogue + Other rows + submit |
| Admin reports page | No-text and no-text-requested queries/UI |

Prefer extending `library-standard-browser.tsx` by splitting into the units above rather than growing one file further.

## Scalability principles

- No hardcoded sector/TC enumerations in UI.
- Sidebar and Analysis lists scroll; search/filter first-class.
- Table paginated / load-more.
- Facets and counts derived from data (API or client from rows), so new standardisation areas appear when seeded in the DB.

## Error handling & empty states

- No sector selected / no matches: explicit empty copy, not a blank panel.
- Submit with nothing: inline validation.
- Options API failure: visible error; do not clear prior good data silently mid-type if aborted.

## Testing

- Unit: filter/facet helpers; no-text detection; request payload with known + Other.
- API: Other-only create; missing-text flag persistence; notification payload includes CC requestor.
- UI smoke: tabs; sidebar expand/collapse; Analysis cards; reports tables render with fixtures.

## Implementation notes

- Preserve existing download/release semantics for officers with access.
- Preserve current design tokens / ARSO visual language; improve hierarchy and affordances rather than a new brand system.
- Schema/entity changes are in scope and were explicitly confirmed during design.

## Success criteria

- Users can open Request and Activity without scrolling past the catalogue.
- Officers can find a standard via sidebar + search/filters among thousands of rows.
- Expand/collapse of sectors/TCs is obvious.
- Analysis remains readable as sectors/TCs grow.
- Requestors can ask for not-listed standards and for listed standards with no text; they receive a CC of the request mail.
- Admins can open Library reports and see no-text and no-text-requested lists.
