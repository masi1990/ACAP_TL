# Consumer complaints — public form & auth inbox — design

Date: 2026-11-19  
Status: Approved for implementation planning  
Scope: Public `/consumers` report form, certified-product lookup, complaint schema/uploads/emails, signed-in `/complaints` inbox with CB scoping  
Codebase: `ACAP_TL/ACAP_TL`  
Schema change: **explicitly approved** — extend `ConsumerComplaint` (and related public search API as needed)

## Problem

The public Consumers page currently exposes a complaint **list** (search, table, pager) that belongs behind authentication. The public form is too thin for market complaints (no product confirmation, origin/purchase context, or photos). Complaints must only target **ARSO-certified products** and must reach the **certifying CB** for that product. ARSO admin must see all complaints; each country CB must see only complaints routed to them.

## Goals

1. Public `/consumers` is **form-only** (no search/list/pager).
2. Consumer must **confirm a certified product** via dynamic search (PIN, brand, manufacturer).
3. Complaint always routes to that product’s **certifying CB**.
4. Rich optional context: origin/manufacture countries, purchase place, quantity, flavour, manufacture/expiry dates, up to 3 photos (label, mark, receipt).
5. On save: email **consumer** a copy; email **routed CB** a copy.
6. Signed-in `/complaints` inbox: ARSO admin/hub/surveillance see **all**; CB staff see **only** their routed complaints.
7. Schema stores the new fields and photo URIs.

## Non-goals

- Full structured CB rules-of-origin block (criterion/regime/local content) on the consumer form — only simple country fields.
- Requiring photos or receipt (all three uploads optional).
- Manual country/CB picker (replaced by certified-product confirmation).
- Changing surveillance case/sanction workflows beyond listing related complaints if already present.
- Public exposure of complaint inbox data.

## Approach

**Dedicated public form + signed-in inbox (Approach 1)**, with **mandatory certified-product confirmation** for routing.

Reuse existing complaint create path (`POST /api/chain/complaints`), notification kinds (`COMPLAINT_RECEIVED`, `COMPLAINT_ROUTED`), and list chrome (`UrlListSearch` / `LinePager`). Extend schema and add a public product search endpoint for the typeahead.

## Information architecture

| Surface | Auth | Contents |
|---------|------|----------|
| `/[locale]/consumers` | Public | Report form only |
| `/[locale]/complaints` | Signed in | Searchable complaint inbox |
| `POST /api/chain/complaints` | Public API | Create complaint (multipart) |
| `GET /api/chain/certified-products` (or equivalent public prefix) | Public API | Certified product typeahead (PIN / brand / manufacturer) |

Header: keep public **Consumers** link to the form. Add **Complaints** under Desks (or equivalent work nav) for allowed roles only.

## Public form

### Certified product (required)

- Single search control: typeahead over **certified** products only.
- Match on **PIN**, **brand/product name**, and **manufacturer/company** (case-insensitive contains / prefix as appropriate).
- Consumer **confirms** one hit before submit.
- Confirmation locks: product identity, brand, manufacturer, PIN (if any), certifying CB id/name.
- Submit without a confirmed certified product is rejected.
- No free-text-only brand path; no manual CB country picker.

### Other fields

| Field | Required |
|-------|----------|
| Complainant email | Yes |
| Subject | Yes |
| What you found (body) | Yes |
| Confirmed certified product | Yes |
| Brand / manufacturer | Yes (from confirmed product; display locked or editable only if product record lacks them — prefer locked from product) |
| Country of manufacture (ISO2) | Yes |
| Country of origin (ISO2) | Yes |
| Where purchased (text) | No |
| Quantity | No |
| Flavour (food) | No |
| Date of manufacture | No |
| Expiry date | No |
| Photo 1 — product label visible | No (fixed guidance caption) |
| Photo 2 — ARSO quality mark placement | No (fixed guidance caption) |
| Photo 3 — receipt | No (fixed guidance caption) |

Receipt and purchase-place text are **both optional** (gift / small shop / no receipt).

### Routing

1. Resolve certifying CB from the confirmed product (`Product.certifyingCbId`, else CoC / certification application organization for the product’s PIN).
2. Persist `pinId` when the product has a PIN; always set `routedCbId` to that certifying CB.
3. Invalid or unconfirmed product → hard error; do not create a row.

## Schema

Extend `ConsumerComplaint` (names may be adjusted slightly in implementation, same intent):

- `productId` (optional FK to `Product` if always available; preferred when confirmed product is a hub `Product`)
- `brand` String
- `manufacturer` String
- `originCountryIso2` String
- `manufactureCountryIso2` String
- `purchasePlace` String? / default `""`
- `quantity` String? / default `""`
- `flavour` String? / default `""`
- `manufacturedOn` DateTime?
- `expiresOn` DateTime?
- `labelPhotoUri` String?
- `markPhotoUri` String?
- `receiptPhotoUri` String?

Keep existing: `complainantEmail`, `subject`, `body`, `status`, `pinId`, `routedCbId`, `createdAt`.

Photos stored under `public/uploads/complaints/` and served like other uploads (`/api/uploads/...` where required).

## Submit API & emails

- `POST /api/chain/complaints` accepts `multipart/form-data` (fields + up to three images).
- Validate image type (jpeg/png/webp) and size (~5 MB each).
- On success:
  1. Email **consumer** a copy of the complaint (reference id, subject, product brand/manufacturer, countries, key details, routed CB name).
  2. Email **routed CB** contacts a copy / summary and pointer to `/complaints`.
- Enrich existing `queueComplaintEmails` payloads so both emails include the fuller complaint copy (not subject-only).
- Audit event remains `CONSUMER_COMPLAINT`.

## Auth inbox (`/[locale]/complaints`)

### Access

- **ARSO admin / hub** (and roles with global complaint/surveillance visibility): **all** complaints.
- **Market surveillance** (`surveillance:operate`): all complaints (same as today on surveillance desk related tab; primary inbox is this page).
- **CB** (`cb:read` for their org): only `routedCbId =` their organization.
- Others: redirect to login/dashboard.

### List UX

- Search across subject, status, brand, manufacturer, complainant email (and PIN when present).
- Clear, match count, table, `LinePager` (page size 20).
- Detail view or expand: photos, dates, purchase place, product, routed CB, status.

CB query **must** filter by `routedCbId`; never leak other orgs’ rows.

## Error handling

- No confirmed certified product → reject.
- Product not certified / not found → reject.
- Missing required countries or email/subject/body → reject.
- Bad image type/size → reject before create (no orphan complaint without intended files; if file write fails after create, surface error and leave URIs null only if documented — prefer transactional “validate then write then create”).

## Testing (implementation plan)

- Public page has form, no list chrome.
- Typeahead finds by PIN, brand, manufacturer; confirm required.
- Create routes to correct CB; CB inbox scoped; admin sees all.
- Optional photos save; emails queued to consumer and CB.
- Unauthenticated `/complaints` redirects to login.

## Open implementation notes (non-blocking)

- Exact product search index source: live `Product` + `ProductPin` (+ imported marks if those are in the public certified registry). Prefer the same population as public Certified products / registry “certified” status.
- Permission helper: reuse `can()` patterns; add a small `canViewComplaints` / scope helper if cleaner than inlining role checks.
