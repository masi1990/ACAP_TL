# Consumer Complaints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public form-only consumer complaints with mandatory certified-product confirmation, photo uploads, consumer+CB emails, and a signed-in CB-scoped inbox.

**Architecture:** Extend `ConsumerComplaint` schema; add complaint access + target-resolution helpers; multipart `POST /api/chain/complaints`; reuse registry search for typeahead; replace public list with auth `/complaints` page.

**Tech Stack:** Next.js App Router, Prisma/Postgres, existing `listCertifiedProducts`, notification queue, `UrlListSearch`/`LinePager`.

## Global Constraints

- Schema changes explicitly approved in spec.
- Public `/consumers` must not show complaint list/search/pager.
- Complaint requires confirmed certified product; route to that product’s certifying CB.
- Photos optional (label, mark, receipt); jpeg/png/webp; ~5 MB each.
- ARSO admin / surveillance: all complaints; CB: only `routedCbId` = their org.
- Do not change unrelated entity models beyond `ConsumerComplaint` (+ Product relation).

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` + migration | New complaint columns + `product` relation |
| `src/lib/complaint-access.ts` | Who can view; Prisma `where` scope |
| `src/lib/complaint-target.ts` | Resolve product/PIN/CB from registry selection |
| `src/lib/complaint-photos.ts` | Store complaint images under `public/uploads/complaints/` |
| `src/app/api/chain/[action]/route.ts` | Multipart fileComplaint + GET certified-products search |
| `src/lib/notifications.ts` | Richer complaint email bodies |
| `src/app/[locale]/consumers/complaint-form.tsx` | Public form with typeahead + files |
| `src/app/[locale]/consumers/page.tsx` | Form only |
| `src/app/[locale]/complaints/page.tsx` | Auth inbox |
| `src/lib/navigation.ts` + `middleware.ts` | Nav link + public API prefixes |
| `tests/complaint-access.test.ts` | Scope helper unit tests |
| `tests/complaint-target.test.ts` | Target resolution unit tests |

---

### Task 1: Schema

**Files:**
- Modify: `prisma/schema.prisma` (`ConsumerComplaint`, `Product` reverse relation)
- Create: `prisma/migrations/20261119140000_consumer_complaint_details/migration.sql`

- [ ] **Step 1:** Add fields to `ConsumerComplaint`: `productId`, `brand`, `manufacturer`, `originCountryIso2`, `manufactureCountryIso2`, `purchasePlace` (default `""`), `quantity` (default `""`), `flavour` (default `""`), `manufacturedOn`, `expiresOn`, `labelPhotoUri`, `markPhotoUri`, `receiptPhotoUri`, `registryKey` (selected registry id string for live-/hub keys).
- [ ] **Step 2:** Add migration SQL with defaults for existing rows (`brand`/`manufacturer`/countries default `""` or backfill empty).
- [ ] **Step 3:** `npx prisma generate` and apply migrate/db push as used in this repo.
- [ ] **Step 4:** Commit schema + migration.

### Task 2: Access + target helpers (TDD)

**Files:**
- Create: `src/lib/complaint-access.ts`, `src/lib/complaint-target.ts`, `src/lib/complaint-photos.ts`
- Test: `tests/complaint-access.test.ts`

**Interfaces:**
- `canViewAllComplaints(user): boolean`
- `complaintListWhere(user): Prisma.ConsumerComplaintWhereInput | null` (null = no access)
- `resolveComplaintTarget({ registryKey, productId, pinCode }): Promise<{ productId, pinId, routedCbId, brand, manufacturer, cbName, pinCode }>`
- `storeComplaintPhoto(file: File, kind: "label"|"mark"|"receipt"): Promise<string>`

- [ ] **Step 1:** Write failing tests for access: global surveillance/admin → all; CB membership → `{ routedCbId: { in: cbIds } }`; no perms → null.
- [ ] **Step 2:** Implement helpers; pass tests.
- [ ] **Step 3:** Implement target resolver using Product (+ CoC org / certifyingCbId) and ImportedCertifiedMark for `live-*` keys.
- [ ] **Step 4:** Commit.

### Task 3: APIs + emails

**Files:**
- Modify: `src/app/api/chain/[action]/route.ts`
- Modify: `src/middleware.ts` (public `GET` search if new path; keep complaints POST public)
- Modify: `src/lib/notifications.ts` (`queueComplaintEmails` + mail bodies)

- [ ] **Step 1:** Support JSON **or** multipart on complaints action; parse fields; require resolved target; save photos then create row.
- [ ] **Step 2:** Add `GET` handler on chain action `certified-products` (or dedicated route under public prefix) wrapping `listCertifiedProducts({ q, status: "certified", pageSize: 20 })`.
- [ ] **Step 3:** Enrich consumer + CB email copy with brand, manufacturer, countries, complaint id, inbox hint.
- [ ] **Step 4:** Commit.

### Task 4: Public form

**Files:**
- Create: `src/app/[locale]/consumers/complaint-form.tsx`
- Modify: `src/app/[locale]/consumers/page.tsx`

- [ ] **Step 1:** Client form: debounced search → confirm product → lock brand/manufacturer/CB display; countries via `countryOptions()`; optional dates/qty/flavour/purchase; 3 file inputs with captions; multipart submit.
- [ ] **Step 2:** Page renders form only (remove UrlListSearch/table/LinePager).
- [ ] **Step 3:** Commit.

### Task 5: Auth inbox + nav

**Files:**
- Create: `src/app/[locale]/complaints/page.tsx`
- Modify: `src/lib/navigation.ts` (`workNav`)
- Modify: `src/lib/rbac.ts` `PUBLIC_PATH_SUFFIXES` only if needed (complaints stays private)

- [ ] **Step 1:** Server page: session + `complaintListWhere`; search/pager; table + detail fields/photos.
- [ ] **Step 2:** Add Complaints desk link for users with access.
- [ ] **Step 3:** Commit.

### Task 6: Verify

- [ ] **Step 1:** `npm test -- tests/complaint-access.test.ts` (and related) pass.
- [ ] **Step 2:** `npm run build` succeeds.
- [ ] **Step 3:** Restart app on 43123.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Public form-only | 4 |
| Certified product search PIN/brand/manufacturer | 3–4 |
| Route to certifying CB | 2–3 |
| Schema + photos | 1, 3 |
| Consumer + CB emails | 3 |
| Auth inbox ARSO all / CB scoped | 2, 5 |
| Optional receipt/purchase | 4 |
