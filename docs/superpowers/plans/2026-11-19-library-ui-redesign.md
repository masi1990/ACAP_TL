# Library UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/[locale]/library` into Catalogue (Browse/Analysis) · Request · Activity tabs with a scalable sidebar browser, missing-text flags, Other/not-listed requests with requestor CC email, and an admin Library reports page.

**Architecture:** Shared catalogue shell (sidebar + filters + table + analysis) reused by Catalogue and Request. Extend `LibraryStandardRequestItem` for free-text and `missingText`. Detect “no text” from published PDF fields. Queue a new `LIBRARY_STANDARD_REQUEST` notification To=`NOTIFY_ADMIN`, Cc=requestor. Admin reports query no-text and no-text-requested standards.

**Tech Stack:** Next.js App Router, React client components, Prisma/PostgreSQL, existing `DeskTabs`, vitest, nodemailer (`src/lib/mail.ts`), notification jobs (`src/lib/notifications.ts`).

**Spec:** `docs/superpowers/specs/2026-11-19-library-ui-redesign-design.md`

## Global Constraints

- Work in nested app root: `/home/acap/ACAP_TL/ACAP_TL` (not the outer wrapper repo).
- Schema/entity changes are approved for this feature only; do not alter unrelated models.
- Preserve library download/release RBAC and watermark-free officer downloads.
- Keep ARSO visual tokens (`--ink`, `--line`, `--muted`, `--surface`); improve hierarchy, do not invent a new brand system.
- No hardcoded sector/TC lists — always derive from DB/API facets.
- Tests: `npm test` (vitest). Prefer focused files under `tests/`.
- Commits: small, one task each; do not commit `.env` or uploaded PDFs.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/library-text.ts` | `standardVersionHasText` / `standardHasText` helpers |
| `prisma/schema.prisma` + migration | Nullable `standardId`, free-text fields, `missingText` on request items |
| `src/app/api/library/options/route.ts` | Expose `hasText` on standards; optional no-text facet counts |
| `src/lib/mail.ts` | Optional `cc` on `sendMail` + outbox |
| `src/lib/notifications.ts` | `LIBRARY_STANDARD_REQUEST` kind, queue helper, prepare + dispatch with CC |
| `src/app/api/library/standard-requests/route.ts` | Accept Other items + missingText; queue notify |
| `src/app/[locale]/library/library-types.ts` | Shared row/facet/filter types (extracted) |
| `src/app/[locale]/library/library-sidebar.tsx` | Searchable sector → TC tree with chevrons |
| `src/app/[locale]/library/library-standards-table.tsx` | Filter bar, table, load-more, file badge, actions |
| `src/app/[locale]/library/library-analysis.tsx` | Cards, category bars, per-sector bars |
| `src/app/[locale]/library/library-catalogue.tsx` | Browse \| Analysis sub-tabs + filter state |
| `src/app/[locale]/library/library-page-shell.tsx` | Catalogue \| Request \| Activity tabs |
| `src/app/[locale]/library/library-standard-browser.tsx` | Thin re-exports / deprecate monolith after split |
| `src/app/[locale]/library/standard-request-form.tsx` | Add-mode catalogue + Other rows + submit |
| `src/app/[locale]/library/page.tsx` | Wire shell; pass holdings/activity |
| `src/app/[locale]/admin/library/reports/page.tsx` | No-text and no-text-requested reports |
| `src/app/[locale]/admin/admin-chrome.tsx` | Link to reports |
| `src/app/[locale]/admin/library/library-admin-client.tsx` | Show Other items on pending requests |
| `tests/library-text.test.ts` | No-text detection |
| `tests/library-standard-request.test.ts` | Payload shaping / notification prepare (unit) |
| `tests/mail-config.test.ts` or `tests/mail-cc.test.ts` | CC plumbing |

---

### Task 1: No-text detection helper

**Files:**
- Create: `src/lib/library-text.ts`
- Test: `tests/library-text.test.ts`

**Interfaces:**
- Produces:
  - `standardVersionHasText(version: { sourcePdfUri?: string | null; languageFiles?: Array<{ sourcePdfUri?: string | null }> }): boolean`
  - Returns `true` if `sourcePdfUri` is non-empty **or** any language file has non-empty `sourcePdfUri`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { standardVersionHasText } from "../src/lib/library-text";

describe("standardVersionHasText", () => {
  it("is false when no PDFs exist", () => {
    expect(standardVersionHasText({ sourcePdfUri: null, languageFiles: [] })).toBe(false);
    expect(standardVersionHasText({ sourcePdfUri: "", languageFiles: [{ sourcePdfUri: "" }] })).toBe(false);
  });

  it("is true when version or language file has a PDF URI", () => {
    expect(standardVersionHasText({ sourcePdfUri: "arso://x.pdf", languageFiles: [] })).toBe(true);
    expect(standardVersionHasText({ sourcePdfUri: null, languageFiles: [{ sourcePdfUri: "arso://en.pdf" }] })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npx vitest run tests/library-text.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/library-text.ts
export function standardVersionHasText(version: {
  sourcePdfUri?: string | null;
  languageFiles?: Array<{ sourcePdfUri?: string | null }>;
}): boolean {
  if (version.sourcePdfUri?.trim()) return true;
  return (version.languageFiles || []).some((file) => Boolean(file.sourcePdfUri?.trim()));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/library-text.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/library-text.ts tests/library-text.test.ts
git commit -m "Add helper to detect standards with no published PDF text."
```

---

### Task 2: Schema — request items for Other + missingText

**Files:**
- Modify: `prisma/schema.prisma` (`LibraryStandardRequestItem`)
- Create: `prisma/migrations/<timestamp>_library_request_other_items/migration.sql`
- Note: User confirmed schema change in the design review.

**Interfaces:**
- Produces model fields:
  - `standardId String?`
  - `standard Standard? @relation(...)`
  - `designationText String @default("")`
  - `titleText String @default("")`
  - `missingText Boolean @default(false)`
  - Drop `@@unique([requestId, standardId])`; add partial unique via raw SQL: `CREATE UNIQUE INDEX ... ON "LibraryStandardRequestItem"("requestId", "standardId") WHERE "standardId" IS NOT NULL;`

- [ ] **Step 1: Update Prisma model**

Replace `LibraryStandardRequestItem` with:

```prisma
model LibraryStandardRequestItem {
  id              String                 @id @default(cuid())
  requestId       String
  request         LibraryStandardRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  standardId      String?
  standard        Standard?              @relation(fields: [standardId], references: [id])
  designationText String                 @default("")
  titleText       String                 @default("")
  missingText     Boolean                @default(false)

  @@index([requestId])
  @@index([standardId])
}
```

Also ensure `Standard.libraryRequestItems` still compiles (optional relation side unchanged except nullability).

- [ ] **Step 2: Write migration SQL**

```sql
-- AlterTable
ALTER TABLE "LibraryStandardRequestItem" DROP CONSTRAINT IF EXISTS "LibraryStandardRequestItem_requestId_standardId_key";
ALTER TABLE "LibraryStandardRequestItem" ALTER COLUMN "standardId" DROP NOT NULL;
ALTER TABLE "LibraryStandardRequestItem" ADD COLUMN IF NOT EXISTS "designationText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibraryStandardRequestItem" ADD COLUMN IF NOT EXISTS "titleText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibraryStandardRequestItem" ADD COLUMN IF NOT EXISTS "missingText" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "LibraryStandardRequestItem_requestId_standardId_uidx"
  ON "LibraryStandardRequestItem"("requestId", "standardId")
  WHERE "standardId" IS NOT NULL;
```

(Adjust exact constraint name from `\d "LibraryStandardRequestItem"` if different.)

- [ ] **Step 3: Generate client**

Run: `npx prisma generate`
Expected: client regenerated without errors

- [ ] **Step 4: Apply migration (dev)**

Run: `npx prisma migrate deploy` (or `migrate dev --name library_request_other_items` if creating via CLI)
Expected: migration applied

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Allow library standard request items without a catalogue standard."
```

---

### Task 3: Options API — `hasText` on standards

**Files:**
- Modify: `src/app/api/library/options/route.ts`
- Modify: `src/app/[locale]/library/library-standard-browser.tsx` types **or** new `library-types.ts` (add `hasText: boolean` to row)
- Test: extend `tests/library-text.test.ts` or add `tests/library-options-has-text.test.ts` for a pure `shapeHasText` if extracted; otherwise verify via a small exported mapper.

**Interfaces:**
- Consumes: `standardVersionHasText` from `@/lib/library-text`
- Produces: each shaped standard includes `hasText: boolean`
- Holdings rows on `page.tsx` must also set `hasText` when building `LibraryStandardRow` (Task 7/8).

- [ ] **Step 1: Extend `standardSelect` to load published version PDF fields**

Include in the findMany select (latest published version only — match existing page pattern: order by year desc take 1):

```ts
versions: {
  where: { publicationStatus: "PUBLISHED" },
  orderBy: { year: "desc" },
  take: 1,
  select: {
    sourcePdfUri: true,
    languageFiles: { select: { sourcePdfUri: true } },
  },
},
```

- [ ] **Step 2: Set `hasText` in `shape()`**

```ts
import { standardVersionHasText } from "@/lib/library-text";

// inside shape():
hasText: standardVersionHasText(standard.versions[0] || {}),
```

- [ ] **Step 3: Add `hasText` to `LibraryStandardRow` type**

```ts
hasText?: boolean; // default true when omitted for backward compat; UI treats undefined as true only if languages present
```

Prefer required `hasText: boolean` everywhere once holdings mapper is updated.

- [ ] **Step 4: Manual/API smoke**

Run: `curl -s 'http://127.0.0.1:43123/arso/api/library/options?browse=1&lang=en' | head` (adjust base path/port)
Expected: JSON standards entries include `"hasText": true|false`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/library/options/route.ts src/app/[locale]/library/library-standard-browser.tsx
git commit -m "Expose hasText on library catalogue options."
```

---

### Task 4: Mail CC support

**Files:**
- Modify: `src/lib/mail.ts`
- Test: `tests/mail-cc.test.ts`

**Interfaces:**
- Produces: `sendMail(input: { to: string; cc?: string | string[]; subject: string; text: string })`
- Outbox files include a `Cc:` line when present.

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

describe("sendMail cc", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "mail-cc-"));
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
    process.env.MAIL_OUTBOX = "1";
    process.env.MAIL_OUTBOX_DIR = dir;
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes Cc into the outbox file", async () => {
    const { sendMail } = await import("../src/lib/mail");
    await sendMail({ to: "ops@example.com", cc: "user@example.com", subject: "Hi", text: "Body" });
    const { readdir } = await import("fs/promises");
    const files = await readdir(dir);
    const body = await readFile(path.join(dir, files[0]!), "utf8");
    expect(body).toContain("To: ops@example.com");
    expect(body).toContain("Cc: user@example.com");
  });
});
```

(If module cache fights env, follow patterns in `tests/mail-config.test.ts`.)

- [ ] **Step 2: Run test — expect FAIL** (no Cc in outbox)

- [ ] **Step 3: Implement**

Update `writeOutbox` and `sendMail`:

```ts
async function writeOutbox(input: { to: string; cc?: string; subject: string; text: string }, dir: string) {
  // ...
  await writeFile(
    file,
    [
      `To: ${input.to}`,
      ...(input.cc ? [`Cc: ${input.cc}`] : []),
      `Subject: ${input.subject}`,
      "",
      input.text,
      "",
    ].join("\n"),
    "utf8",
  );
}

export async function sendMail(input: { to: string; cc?: string | string[]; subject: string; text: string }) {
  const cc = Array.isArray(input.cc) ? input.cc.filter(Boolean).join(", ") : input.cc?.trim() || undefined;
  // pass cc into nodemailer transport.sendMail({ ..., cc }) and writeOutbox
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/mail.ts tests/mail-cc.test.ts
git commit -m "Allow notification mail to carbon-copy recipients."
```

---

### Task 5: Notification — LIBRARY_STANDARD_REQUEST with CC

**Files:**
- Modify: `src/lib/notifications.ts`
- Modify: `tests/notifications.test.ts` (or new focused test)

**Interfaces:**
- Produces:
  - `NotificationKind.LIBRARY_STANDARD_REQUEST = "LIBRARY_STANDARD_REQUEST"`
  - `queueLibraryStandardRequest(input: { requestId: string; email: string; name: string; organizationName: string; countryName: string; note: string; lines: string[] })`
  - `prepareNotification` case: `recipients: [NOTIFY_ADMIN]`, `cc: [requestor email]`, subject/body listing lines
- Dispatch loop must pass `cc` into `sendMail` when prepared message includes it.

Change prepared type to:

```ts
| { subject: string; text: string; recipients: string[]; cc?: string[] }
```

In `dispatchDueNotifications`:

```ts
await sendMail({
  to,
  subject: prepared.subject,
  text: prepared.text,
  ...(prepared.cc?.length && to === prepared.recipients[0] ? { cc: prepared.cc } : {}),
});
```

(Only attach CC on the primary/admin send so the requestor is not CC’d on their own To copy. Prefer **single** recipient = admin, with `cc` = requestor — do not duplicate To for requestor.)

- [ ] **Step 1: Write failing unit test for prepare/queue**

```ts
it("queues LIBRARY_STANDARD_REQUEST for admin with requestor cc in payload", async () => {
  // enqueue via queueLibraryStandardRequest; assert job.kind and payload JSON has email + lines
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement kind, queue helper, prepare case**

```ts
case NotificationKind.LIBRARY_STANDARD_REQUEST: {
  const admin = mailConfig()?.admin;
  return {
    recipients: onlyEmails([admin]),
    cc: onlyEmails([payloadText(payload, "email")]),
    subject: `Library standard request from ${payloadText(payload, "name")}`,
    text: [
      `${payloadText(payload, "name")} <${payloadText(payload, "email")}>`,
      payloadText(payload, "organizationName"),
      payloadText(payload, "countryName"),
      "",
      "Requested:",
      ...String(payload.lines || "")
        .split(" | ")
        .filter(Boolean)
        .map((line) => `- ${line}`),
      "",
      payloadText(payload, "note") ? `Note: ${payloadText(payload, "note")}` : "",
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
  };
}
```

Payload `lines` joined with ` | ` like `LIBRARY_RELEASE` titles.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts tests/notifications.test.ts
git commit -m "Notify ARSO of library standard requests and CC the requestor."
```

---

### Task 6: POST `/api/library/standard-requests` — Other items + notify

**Files:**
- Modify: `src/app/api/library/standard-requests/route.ts`
- Modify: admin mapping that reads `items` if needed (Task 10)
- Test: `tests/library-standard-request.test.ts` (pure validation helper preferred)

**Interfaces:**
- Consumes: `queueLibraryStandardRequest`, `notifyAfterCommit`, `standardVersionHasText`
- Body:
  ```ts
  {
    name, email, organizationId, memberStateId, note,
    standardIds: string[],
    otherItems?: Array<{ designation: string; title?: string }>
  }
  ```
- Validation: require `name`, valid email, org/country; require `standardIds.length + otherItems.length >= 1`
- For each known id: create item with `standardId`, `missingText: !hasText(publishedVersion)`, `designationText`/`titleText` empty
- For each other: `standardId: null`, `designationText`, `titleText`, `missingText: false`
- After create: `queueLibraryStandardRequest` + `notifyAfterCommit()`

Extract helper for clarity:

```ts
// src/lib/library-standard-request.ts
export function buildRequestLines(input: {
  known: Array<{ designation: string; missingText: boolean }>;
  other: Array<{ designation: string; title?: string }>;
}): string[] {
  return [
    ...input.known.map((row) => `${row.designation}${row.missingText ? " [no text]" : ""}`),
    ...input.other.map((row) => `${row.designation}${row.title ? ` — ${row.title}` : ""} [not listed]`),
  ];
}
```

- [ ] **Step 1: Failing test for `buildRequestLines`**

- [ ] **Step 2: Implement helper + route changes**

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/app/api/library/standard-requests/route.ts src/lib/library-standard-request.ts tests/library-standard-request.test.ts
git commit -m "Accept not-listed standards on library requests and email ARSO."
```

---

### Task 7: Split catalogue UI — types, sidebar, table, analysis

**Files:**
- Create: `src/app/[locale]/library/library-types.ts` (move `LibraryStandardRow`, `LibraryFacet`, `Filter`, tones helpers as needed)
- Create: `src/app/[locale]/library/library-sidebar.tsx`
- Create: `src/app/[locale]/library/library-standards-table.tsx`
- Create: `src/app/[locale]/library/library-analysis.tsx`
- Create: `src/app/[locale]/library/library-catalogue.tsx`
- Modify: `src/app/[locale]/library/library-standard-browser.tsx` to re-export `LibraryCatalogue` / `LibraryHoldings` for compatibility

**Interfaces:**
- `LibraryCatalogue` props:
  ```ts
  {
    locale: Locale;
    rows: LibraryStandardRow[];
    facets?: LibraryFacet;
    filter?: { sectorId: string; committeeId: string; kind: string };
    onFilter?: (next: { sectorId: string; committeeId: string; kind: string }) => void;
    mode: "browse" | "add";
    action?: (row: LibraryStandardRow) => ReactNode;
    emptyLabel?: string;
    onSelectSectorFromAnalysis?: (sectorId: string) => void;
  }
  ```
- Sidebar: searchable tree; chevron buttons; `aria-expanded`; expand sector → list TCs; select TC sets filter
- Table: sticky filters (search input optional when parent owns query — for holdings use local search on `rows`; for Request parent owns `q` via options API — pass `query`/`onQuery` optional props)
- Analysis: summary cards (sectors, TCs, standards, no-text count), category bars, per-sector bars; sector click → Browse with sector selected

**Holdings search:** client-filter `rows` by designation/title when `mode==="browse"` and rows are preloaded.

**Request search:** keep server `q` in `StandardRequestForm` (Task 9); pass into catalogue.

- [ ] **Step 1: Extract types without behavior change; commit if needed**

- [ ] **Step 2: Implement `LibrarySidebar` with chevrons**

Representative markup:

```tsx
<button type="button" aria-expanded={open} className="flex w-full items-center gap-2 ...">
  <span aria-hidden className="font-mono text-xs">{open ? "▾" : "▸"}</span>
  <span className="flex-1 text-left">{sector.code} {sector.name}</span>
  <span className="rounded-full ...">{tcCount}</span>
</button>
```

- [ ] **Step 3: Implement `LibraryStandardsTable` with category filter + No text badge**

```tsx
{row.hasText === false ? (
  <span className="rounded-full bg-[#7a3b2e] px-2 py-0.5 text-xs text-white">No text</span>
) : null}
```

- [ ] **Step 4: Implement `LibraryAnalysis`**

Use CSS width % bars from counts (no chart library):

```tsx
<div className="h-2 rounded-full bg-[var(--surface-2)]">
  <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: tone.solid }} />
</div>
```

- [ ] **Step 5: Wire `LibraryCatalogue` with `DeskTabs` nested (syncHash=false) for Browse/Analysis**

```tsx
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";

<DeskTabs
  syncHash={false}
  activeId={view}
  onSelect={(id) => setView(id as "browse" | "analysis")}
  tabs={[
    { id: "browse", label: "Browse", content: <>...</> },
    { id: "analysis", label: "Analysis", content: <LibraryAnalysis ... /> },
  ]}
/>
```

- [ ] **Step 6: Keep `LibraryHoldings` working via re-export; smoke in browser**

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/library/
git commit -m "Split library catalogue into sidebar, table, and analysis views."
```

---

### Task 8: Page shell — Catalogue / Request / Activity tabs

**Files:**
- Create: `src/app/[locale]/library/library-page-shell.tsx`
- Modify: `src/app/[locale]/library/page.tsx`

**Interfaces:**
- Props:
  ```ts
  {
    locale: Locale;
    holdingsRows: LibraryStandardRow[] | null; // null = no access / empty messaging handled by parent
    accessMessage?: ReactNode;
    activity: Array<{ id: string; at: string; action: string; roleCode?: string; designation?: string; language?: string; posting?: string }>;
    signedIn: boolean;
    requestForm: ReactNode; // <StandardRequestForm ... />
  }
  ```
- Use `DeskTabs` with ids `catalogue` | `request` | `activity` (omit activity when `!signedIn`)
- Catalogue tab: if `holdingsRows` non-null and length≥0 with access, show `LibraryCatalogue` mode=browse with download actions; else show options-fed browse **or** accessMessage + still allow guest browse via embedding request's browser only on Request — **per spec:** guests get Catalogue browse via options API.

**Guest Catalogue browse:** render a small client wrapper `LibraryPublicCatalogue` that fetches `/api/library/options?browse=1` (same as request form) in read-only mode without Add. Alternatively reuse `LibraryCatalogue` inside a thin client that loads options. Prefer one `LibraryOptionsBrowser` used by guest Catalogue and by Request (Request adds actions).

Simplest path matching spec:
- Signed-in with access: holdings in Catalogue
- Else: `LibraryOptionsBrowser` read-only in Catalogue (extract from request form data fetching)

- [ ] **Step 1: Implement shell with DeskTabs**

- [ ] **Step 2: Update `page.tsx` to pass holdings, activity, and `<StandardRequestForm />` into shell; remove stacked activity/form from bottom**

- [ ] **Step 3: Ensure `hasText` on holdings `libraryRow()`** using published version fields already loaded

- [ ] **Step 4: Manual check** — tabs switch; Activity hidden when signed out

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/library/page.tsx src/app/[locale]/library/library-page-shell.tsx
git commit -m "Move library request and activity into top-level tabs."
```

---

### Task 9: Request form — Other / not listed + Add mode

**Files:**
- Modify: `src/app/[locale]/library/standard-request-form.tsx`

**Interfaces:**
- State: `otherItems: Array<{ id: string; designation: string; title: string }>`
- UI block under selected list:

```tsx
<section className="grid gap-2 rounded-lg border border-dashed border-[var(--line)] p-3">
  <h3 className="text-sm font-semibold">Other / not listed</h3>
  <p className="text-xs text-[var(--muted)]">Use this when the standard is missing from the catalogue or you only know the number.</p>
  {otherItems.map((row) => (
    // designation input, optional title, remove
  ))}
  <button type="button" onClick={() => setOtherItems((rows) => [...rows, { id: crypto.randomUUID(), designation: "", title: "" }])}>
    Add another
  </button>
</section>
```

- Submit body includes `otherItems: otherItems.filter(r => r.designation.trim()).map(...)`
- Allow submit when `selected.length + otherItemsWithDesignation.length >= 1`
- Use shared catalogue in Add mode; No text rows still Add-able
- Remove nested duplicate page chrome; form lives inside Request tab only

- [ ] **Step 1: Wire Other UI + payload**

- [ ] **Step 2: Validate empty submit shows inline error**

- [ ] **Step 3: Manual smoke** — add known + Other; confirm API 200

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/library/standard-request-form.tsx
git commit -m "Let requestors add standards that are not in the catalogue."
```

---

### Task 10: Admin — show Other items; Library reports page

**Files:**
- Modify: `src/app/[locale]/admin/library/page.tsx` (pass Other fields)
- Modify: `src/app/[locale]/admin/library/library-admin-client.tsx`
- Create: `src/app/[locale]/admin/library/reports/page.tsx`
- Modify: `src/app/[locale]/admin/admin-chrome.tsx` — add nav item near Library

**Admin pending requests:** For each item, show `standard.designation` or `designationText` + `[not listed]` / `[no text]` badges. Checkboxes for release only for items with `standardId`.

**Reports page queries:**

```ts
// Pseudo
const publishedVersions = await prisma.standard.findMany({
  where: { versions: { some: { publicationStatus: "PUBLISHED" } } },
  include: {
    technicalCommittee: { include: { sector: true } },
    versions: {
      where: { publicationStatus: "PUBLISHED" },
      orderBy: { year: "desc" },
      take: 1,
      include: { languageFiles: true },
    },
    libraryRequestItems: { select: { id: true, request: { select: { createdAt: true } } } },
  },
  orderBy: { designation: "asc" },
});

const noText = publishedVersions.filter((s) => !standardVersionHasText(s.versions[0] || {}));
const noTextRequested = noText
  .map((s) => ({
    ...s,
    requestCount: s.libraryRequestItems.length,
    latestRequestAt: s.libraryRequestItems.reduce((max, item) => /* max createdAt */, null as Date | null),
  }))
  .filter((s) => s.requestCount > 0);
```

Auth: same as admin library (`institutions:write` || `audit:read`).

UI: two sections with tables (Designation, Title, Sector, TC, and for requested: count + latest date). Link from admin chrome: `{ href: \`/${locale}/admin/library/reports\`, label: "Library reports" }`.

- [ ] **Step 1: Update admin standard-request display for Other/missingText**

- [ ] **Step 2: Implement reports page**

- [ ] **Step 3: Add chrome link**

- [ ] **Step 4: Manual check** as admin user

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/admin/library/ src/app/[locale]/admin/admin-chrome.tsx
git commit -m "Add admin reports for standards with no published text."
```

---

### Task 11: End-to-end verification

**Files:** none (verification only); fix any gaps found

- [ ] **Step 1: Run unit tests**

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npm test`
Expected: all pass (or only pre-existing failures unrelated — do not ignore new failures)

- [ ] **Step 2: Lint touched files**

Run: `npx eslint src/app/[locale]/library src/app/api/library src/lib/library-text.ts src/lib/library-standard-request.ts src/lib/mail.ts src/lib/notifications.ts src/app/[locale]/admin/library --max-warnings 0`
Expected: clean

- [ ] **Step 3: Browser checklist** against `https://acap.arso-oran.org/arso/en/library` or local with basePath
  - Top tabs: Catalogue / Request / (Activity if signed in)
  - Browse: sidebar expand/collapse chevrons; search; sector/TC/category filters; No text badge
  - Analysis: cards + bars; click sector → Browse
  - Request: Add known + Other; submit; outbox/SMTP shows admin To + requestor Cc
  - Admin reports: no-text lists populate

- [ ] **Step 4: Final commit only if fixes were needed**

```bash
git commit -m "Fix library redesign verification issues."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Top tabs Catalogue / Request / Activity | 8 |
| Browse sidebar + filters + table | 7 |
| Expand/collapse chevrons | 7 |
| Analysis cards + category + sector bars | 7 |
| Scalable / no hardcoding | 7 (facets from data) |
| Request Add + Other free text | 9 |
| Request no-text flagged | 3, 6, 9 |
| Email To ARSO + CC requestor | 4, 5, 6 |
| Schema Other + missingText | 2 |
| Admin `/admin/library/reports` | 10 |
| Guest catalogue browse via options | 8 |
| Preserve downloads/RBAC | 8 (holdings actions unchanged) |

## Placeholder / consistency notes

- Notification kind name: `LIBRARY_STANDARD_REQUEST` everywhere.
- Field names: `designationText`, `titleText`, `missingText`, `hasText`.
- Admin recipient: `mailConfig().admin` / `NOTIFY_ADMIN`.
- Nested app path: `/home/acap/ACAP_TL/ACAP_TL`.
