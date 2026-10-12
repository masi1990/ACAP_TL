# ACAP Trade — ARSO ACAP–TL

Continental conformity and trade hub: **tariff line → machine-readable ARS → lab evidence → CoC / marks / PIN**, with a standards webstore, **public certified-products registry**, and **role-gated admin CRUD** (RBAC + least privilege).

## Stack

- Next.js (App Router) + TypeScript + Tailwind + Radix primitives
- Prisma + PostgreSQL (`postgresql://USER@127.0.0.1:5432/acap_tl`)

## Quick start

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run db:seed-registry   # sample Quality / Eco Mark certified products
npm run dev
```

Open **[http://127.0.0.1:43123](http://127.0.0.1:43123)**.

### Bootstrap accounts (password `ChangeMe!ACAP`)

| Email | Role | Access |
|---|---|---|
| `admin@arso-oran.org` | `ARSO_ADMIN` | Full catalogue + roles admin |
| `support@arso-oran.org` | `ARSO_SUPPORT` | Write/import — **no deletes / no role write** |
| `catalogue@arso-oran.org` | `ARSO_CATALOGUE_EDITOR` | Standards, RECs, tariffs only |
| `auditor@arso-oran.org` | `ARSO_AUDITOR` | Read-only + full standard preview |

## Public surfaces (unauthenticated)

- `/en` — home
- `/en/lookup` — tariff → standard name + Scope (+ link to certified products)
- `/en/verify` — PIN verify
- `/en/registry` — **Certified products** (Quality Mark / Eco Mark Africa), grouped by region → country A–Z
- `/en/store` — webstore (Clause 1 Scope preview only)
- `/en/store/return` — Pesapal payment return / download
- `/en/login` — sign-in

## Pesapal payments (store)

The uploaded WooCommerce plugin (`thebunch-ke-pesapal-woocommerce`) is **API reference only** — it cannot run inside Next.js. Checkout uses the same **Pesapal API v3** endpoints as that plugin (`Auth/RequestToken`, `RegisterIPN`, `SubmitOrderRequest`, `GetTransactionStatus`).

```bash
# .env — live keys from the Pesapal merchant dashboard (demo keys do not move real money)
PESAPAL_CONSUMER_KEY="your-consumer-key"
PESAPAL_CONSUMER_SECRET="your-consumer-secret"
PESAPAL_ENV="live"          # demo for sandbox only
PESAPAL_IPN_ID=""           # optional; registered and stored in PesapalNotification if empty
APP_BASE_URL="https://your-public-host"  # Pesapal must reach this https address for the IPN
```

The standard is released only after Pesapal reports `COMPLETED`. The order, buyer phone, tracking id, confirmation code, payment method, and download path are stored in PostgreSQL.

## Product certification model

```
Tariff line(s)  ←maps→  Standard version  ←certifies→  Product  →  CoC (Quality / Eco / both)  →  PIN
```

- Public registry reads issued **CoC** records (status, marks, CB, standard, tariff, country).
- CB-controlled workflow (applications, lab evidence, issue CoC) stays authenticated — next slice.

### Integration advice (existing `acap.arso-oran.org` vs this hub)

**Recommend: single system of record in this hub, with a temporary bridge — not permanent dual-write.**

| Option | When | Trade-off |
|---|---|---|
| **A. Incorporate here (preferred)** | You own the long-term ACAP–TL platform | One registry, one CoC/PIN model, one RBAC story; migrate historical rows once |
| **B. Integrate / federate** | Marks console must stay live for printing/ops | Public registry here calls or syncs from `acap.arso-oran.org`; risk of drift and two UIs |
| **C. Dual-run indefinitely** | Political / vendor lock | Highest cost; avoid |

Practical path: keep this public registry as the **citizen-facing** surface now; map fields 1:1 to the existing Marks console; later either (1) import CoCs via API/ETL into this DB, or (2) point the old console at the same PostgreSQL. Do **not** build two write paths for certification decisions.

## Admin CRUD (authenticated)

`/en/admin` — RBAC on every API:

1. RECs · Tariff codes · Standards (multi-tariff + PDF/Word import + full preview)
2. Manufacturer / importer · Certification bodies
3. Roles & RBAC
4. Dashboard after login shows assigned roles

## Tests

```bash
npm test
```
