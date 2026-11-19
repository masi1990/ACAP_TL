# Admin server health — design

Date: 2026-11-19  
Status: Approved for implementation planning  
Scope: Admin page for host/app diagnostics, service probes, disk, CPU temp, API basePath confirmation, database connection health  
Codebase: `ACAP_TL/ACAP_TL` (route `/[locale]/admin/health`, live under `/arso/...`)

## Problem

Operators need a quick in-admin view of whether the ACAP Trade host is healthy while testing and running production under IIS → `/arso`. There is no existing health UI. Accidental use of bare `/api` (instead of `/arso/api`) has caused confusion during testing and needs a simple confirmation check.

## Goals

1. Admin **Server health** page with short, tabbed UI (not one long crowded page).
2. Show server state, uptime, hostname, IP addresses, load/memory.
3. Show key services running or not (app/PM2, Postgres summary, SMTP, port listen).
4. Dedicated **Database** tab: DB connection status and basic connection health.
5. Disk used / remaining (and simple health of space).
6. Dedicated **Processor** tab: CPU temperature when available.
7. Dedicated **API path** tab: confirm configured `basePath` and live probes so traffic is expected under `/arso/api`, not bare `/api`.
8. Auth: system admin **and** `audit:read` only.

## Non-goals

- No entity or DB schema changes.
- No Prometheus / external monitoring product.
- No access-log forensics of historical `/api` hits.
- No remote agent on the IIS front-end host — only metrics this Node process/host can see.
- No email/alert dispatch from this page in v1.

## Approach

**Single admin page + one health API** (Approach 1), with in-page tabs so each concern stays on its own short panel.

## Information architecture

### Route & nav

- Page: `/[locale]/admin/health`
- Admin chrome nav label: **Server health**
- Visible when: `canOpenAdmin(session.user)` (system admin) **and** `can(session.user, "audit:read")`
- API: `GET /api/admin/health` → publicly reached as `/arso/api/admin/health` via `basePath: "/arso"`

### Page chrome

- Title + one-line subtitle
- Overall status badge: `healthy` | `degraded` | `down`
- Last checked timestamp
- **Refresh** control (manual)
- Optional light auto-refresh (~30s) while the page is open
- In-page **tabs**; only the active tab’s content is shown

### Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | Overall state, uptime, hostname, addresses (IPs), load/memory summary |
| **Services** | Status rows: Next/PM2 app, Postgres (summary), SMTP reachability, configured port listen (e.g. 43123) — each `running` / `down` / `unknown` |
| **Database** | Connection to Postgres: connected or not, probe latency, safe connection identity (db name/host, never password), optional server version if cheap |
| **Storage** | Disk mounts: used / free / total + usage bar; warn when low |
| **Processor** | CPU temperature (°C) when sensors exist; cores/load; clear unavailable copy if no sensor |
| **API path** | Confirmation: configured `basePath` (`/arso`), expected prefix `/arso/api`, live probe of `/arso/api/...` (expect success) vs bare `/api/...` (expect miss/fail under this deploy) → Pass / Fail |

Layout rules: one job per tab; compact status rows and a few metrics; reuse existing admin visual language (`NavTabs` or equivalent); avoid nested card clutter.

## Data & API

### Auth

- Page: redirect to login if unsigned; `notFound` (or equivalent) if not system admin + `audit:read`
- API: `401` if no session; `403` if insufficient privilege

### `GET /api/admin/health` payload

One JSON payload; tabs select fields:

- `status`: `healthy` | `degraded` | `down`
- `collectedAt`: ISO timestamp
- `uptimeSeconds`, `hostname`
- `addresses[]`: non-loopback IPv4/IPv6 (loopback optional/secondary)
- `memory`, `load`: summary objects
- `services[]`: `{ id, label, state: "running"|"down"|"unknown", detail? }`
- `database`: `{ connected: boolean, latencyMs?: number, host?: string, database?: string, serverVersion?: string, error?: string }`
- `disks[]`: mount, usedBytes, freeBytes, totalBytes, percentUsed
- `processor`: `{ available: boolean, tempsC?: number[], load?, cores?, detail? }`
- `apiPath`: `{ basePath, expectedPrefix, configuredOk, probes: [{ path, ok, statusCode? }] }`

### Collection rules

| Check | How |
|-------|-----|
| App / PM2 | Process uptime / optional PM2 name awareness; treat responding health API as app up |
| Port listen | Check configured `PORT` (default 43123) is listening |
| Postgres (Services + Database) | `SELECT 1` (and optional version query); measure latency; parse host/db from `DATABASE_URL` without credentials |
| SMTP | Config present + short verify/connect; do not send mail |
| Disk | OS filesystem stats for relevant mounts |
| CPU temp | Linux thermal/hwmon (or equivalent) when present; never throw if missing |
| API path (A + B) | **A** Static: `basePath === "/arso"` and expected API prefix `/arso/api`. **B** Live: server-side probe to self for a known path under `/arso/api/...` (expect success) and bare `/api/...` (expect failure/miss under this deploy). Confirmation only for testing accidents. |

### Status aggregation

- `down`: core app cannot serve, or database not connected
- `degraded`: any non-core service down, disk critically low, API path confirmation Fail, or temp/sensor issues that warrant attention without taking the app offline
- `healthy`: otherwise

Exact thresholds (e.g. disk warn %) fixed in implementation plan; keep defaults conservative.

## Components

| Unit | Responsibility |
|------|----------------|
| `AdminHealthPage` | Auth gate, chrome, tabs, refresh |
| `HealthOverviewTab` | State, uptime, IPs, load/memory |
| `HealthServicesTab` | Service status rows |
| `HealthDatabaseTab` | DB connection status, latency, safe identity |
| `HealthStorageTab` | Disk used/free |
| `HealthProcessorTab` | Temp + load; unavailable state |
| `HealthApiPathTab` | basePath + live probes |
| `collectServerHealth()` | Server-side collector lib; no schema changes |

Prefer client fetch of the health API so Refresh does not full-reload the page.

## Error handling

- Individual probe failures mark that row **down** / **unknown**; the page and other tabs still load.
- Missing CPU sensors → Processor tab shows unavailable, not a global error.
- DB disconnect → Database tab shows disconnected; overall status `down`.
- API path Fail → red Fail on API path tab; overall at least `degraded`.
- Unauthorized access follows existing admin patterns.

## Testing

- Unit: status aggregation; API path `configuredOk`; disk percent helpers; DB payload redaction (no password).
- API: 401/403 without privilege; 200 payload shape with mocked probes for privileged user.
- UI smoke: tab switching; each tab renders success and failure fixtures without crashing.

## Implementation notes

- Preserve `basePath: "/arso"`; do not introduce bare `/api` client helpers for this feature.
- No Prisma schema / entity file changes.
- Follow existing admin chrome and RBAC helpers (`canOpenAdmin`, `can(..., "audit:read")`).
- Windows/Linux differences: probes must degrade gracefully when a metric is OS-specific.

## Success criteria

- Privileged admin opens **Server health** and sees overall state without a long single page.
- Tabs cover Overview, Services, Database, Storage, Processor, API path.
- Database tab clearly shows connected vs not and basic latency/identity.
- API path tab confirms `/arso/api` is the expected path and live probes match that expectation.
- Unprivileged users cannot open the page or call the API.
