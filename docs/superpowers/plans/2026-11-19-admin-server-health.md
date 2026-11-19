# Admin Server Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin **Server health** page with tabbed Overview / Services / Database / Storage / Processor / API path panels, backed by `GET /api/admin/health`, so operators can confirm host health and that APIs are under `/arso/api` not bare `/api`.

**Architecture:** Pure helpers in `src/lib/server-health.ts` for status aggregation and API-path confirmation; async `collectServerHealth()` gathers OS/DB/SMTP/port/temp/probes; a thin API route gates on system-admin + `audit:read`; a client page uses `DeskTabs` + `apiFetch` so each concern stays on a short tab.

**Tech Stack:** Next.js App Router, React client components, Prisma (`SELECT 1`), Node `os`/`fs`, existing `DeskTabs`, `apiFetch` / `BASE_PATH`, vitest, admin chrome RBAC.

**Spec:** `docs/superpowers/specs/2026-11-19-admin-server-health-design.md`

## Global Constraints

- Work in nested app root: `/home/acap/ACAP_TL/ACAP_TL` (not the outer wrapper repo).
- **No** Prisma schema / entity file changes.
- Preserve `basePath: "/arso"`; client calls must use `apiFetch` (never bare `/api` without `withBasePath`).
- Auth: page + API require `canOpenAdmin(user)` **and** `can(user, "audit:read")`.
- Disk warn threshold: `percentUsed >= 90` → contribute to `degraded`.
- DB unreachable → overall `status: "down"`.
- API path confirmation Fail → overall at least `degraded`.
- CPU temp missing → Processor shows unavailable; do not fail the whole page.
- Live API probes must **not** call `collectServerHealth` (use a separate ping route to avoid recursion).
- Keep ARSO tokens (`--ink`, `--line`, `--muted`, `--surface`, `--accent`); compact status rows, not card spam.
- Tests: `npm test` / `npx vitest run tests/server-health.test.ts`. Prefer focused files under `tests/`.
- Commits: small, one task each; do not commit `.env`.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/server-health.ts` | Types, pure helpers: disk %, status aggregation, API path configuredOk, DATABASE_URL redaction |
| `src/lib/server-health-collect.ts` | `collectServerHealth()` — OS, DB, SMTP, port, temp, live probes |
| `src/app/api/admin/health/ping/route.ts` | Lightweight `{ ok: true }` after auth (for live probes) |
| `src/app/api/admin/health/route.ts` | `GET` → full health JSON |
| `src/app/[locale]/admin/health/page.tsx` | Auth gate + render client |
| `src/app/[locale]/admin/health/health-client.tsx` | Refresh, status badge, `DeskTabs`, tab panels |
| `src/app/[locale]/admin/admin-chrome.tsx` | Nav link **Server health** |
| `tests/server-health.test.ts` | Pure helpers + aggregation |

---

### Task 1: Types and pure helpers (TDD)

**Files:**
- Create: `src/lib/server-health.ts`
- Test: `tests/server-health.test.ts`

**Interfaces:**
- Produces:
  - Types: `HealthStatus`, `ServiceState`, `HealthService`, `HealthDatabase`, `HealthDisk`, `HealthProcessor`, `HealthApiPath`, `ServerHealthReport`
  - `diskPercentUsed(usedBytes: number, totalBytes: number): number`
  - `parseDatabaseUrlIdentity(url: string | undefined): { host?: string; database?: string }` (never returns password/user)
  - `apiPathConfiguredOk(basePath: string, expectedPrefix: string): boolean`
  - `aggregateHealthStatus(input: { databaseConnected: boolean; servicesDown: boolean; diskCritical: boolean; apiPathFail: boolean }): HealthStatus`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  aggregateHealthStatus,
  apiPathConfiguredOk,
  diskPercentUsed,
  parseDatabaseUrlIdentity,
} from "../src/lib/server-health";

describe("diskPercentUsed", () => {
  it("rounds to one decimal and handles zero total", () => {
    expect(diskPercentUsed(50, 100)).toBe(50);
    expect(diskPercentUsed(1, 3)).toBeCloseTo(33.3, 1);
    expect(diskPercentUsed(10, 0)).toBe(0);
  });
});

describe("parseDatabaseUrlIdentity", () => {
  it("returns host and database without credentials", () => {
    expect(parseDatabaseUrlIdentity("postgresql://arso:secret@127.0.0.1:5432/acap_tl?schema=public")).toEqual({
      host: "127.0.0.1",
      database: "acap_tl",
    });
  });

  it("returns empty object for missing/invalid URL", () => {
    expect(parseDatabaseUrlIdentity(undefined)).toEqual({});
    expect(parseDatabaseUrlIdentity("not-a-url")).toEqual({});
  });
});

describe("apiPathConfiguredOk", () => {
  it("passes only for /arso and /arso/api", () => {
    expect(apiPathConfiguredOk("/arso", "/arso/api")).toBe(true);
    expect(apiPathConfiguredOk("", "/api")).toBe(false);
    expect(apiPathConfiguredOk("/arso", "/api")).toBe(false);
  });
});

describe("aggregateHealthStatus", () => {
  it("is down when database is disconnected", () => {
    expect(
      aggregateHealthStatus({
        databaseConnected: false,
        servicesDown: false,
        diskCritical: false,
        apiPathFail: false,
      }),
    ).toBe("down");
  });

  it("is degraded for non-core failures when DB is up", () => {
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: true,
        diskCritical: false,
        apiPathFail: false,
      }),
    ).toBe("degraded");
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: false,
        diskCritical: true,
        apiPathFail: false,
      }),
    ).toBe("degraded");
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: false,
        diskCritical: false,
        apiPathFail: true,
      }),
    ).toBe("degraded");
  });

  it("is healthy when all clear", () => {
    expect(
      aggregateHealthStatus({
        databaseConnected: true,
        servicesDown: false,
        diskCritical: false,
        apiPathFail: false,
      }),
    ).toBe("healthy");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npx vitest run tests/server-health.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/server-health.ts
export type HealthStatus = "healthy" | "degraded" | "down";
export type ServiceState = "running" | "down" | "unknown";

export type HealthService = {
  id: string;
  label: string;
  state: ServiceState;
  detail?: string;
};

export type HealthDatabase = {
  connected: boolean;
  latencyMs?: number;
  host?: string;
  database?: string;
  serverVersion?: string;
  error?: string;
};

export type HealthDisk = {
  mount: string;
  usedBytes: number;
  freeBytes: number;
  totalBytes: number;
  percentUsed: number;
};

export type HealthProcessor = {
  available: boolean;
  tempsC?: number[];
  load?: number[];
  cores?: number;
  detail?: string;
};

export type HealthApiProbe = {
  path: string;
  ok: boolean;
  statusCode?: number;
  detail?: string;
};

export type HealthApiPath = {
  basePath: string;
  expectedPrefix: string;
  configuredOk: boolean;
  probes: HealthApiProbe[];
};

export type ServerHealthReport = {
  status: HealthStatus;
  collectedAt: string;
  uptimeSeconds: number;
  hostname: string;
  addresses: string[];
  memory: { freeBytes: number; totalBytes: number; usedBytes: number };
  load: number[];
  services: HealthService[];
  database: HealthDatabase;
  disks: HealthDisk[];
  processor: HealthProcessor;
  apiPath: HealthApiPath;
};

export const DISK_CRITICAL_PERCENT = 90;

export function diskPercentUsed(usedBytes: number, totalBytes: number): number {
  if (!totalBytes || totalBytes <= 0) return 0;
  return Math.round((usedBytes / totalBytes) * 1000) / 10;
}

export function parseDatabaseUrlIdentity(url: string | undefined): { host?: string; database?: string } {
  if (!url?.trim()) return {};
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "").split("/")[0] || undefined;
    return {
      host: parsed.hostname || undefined,
      database: database || undefined,
    };
  } catch {
    return {};
  }
}

export function apiPathConfiguredOk(basePath: string, expectedPrefix: string): boolean {
  return basePath === "/arso" && expectedPrefix === "/arso/api";
}

export function aggregateHealthStatus(input: {
  databaseConnected: boolean;
  servicesDown: boolean;
  diskCritical: boolean;
  apiPathFail: boolean;
}): HealthStatus {
  if (!input.databaseConnected) return "down";
  if (input.servicesDown || input.diskCritical || input.apiPathFail) return "degraded";
  return "healthy";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npx vitest run tests/server-health.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/acap/ACAP_TL/ACAP_TL
git add src/lib/server-health.ts tests/server-health.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): add server health pure helpers

EOF
)"
```

---

### Task 2: Health collector

**Files:**
- Create: `src/lib/server-health-collect.ts`
- Modify: `tests/server-health.test.ts` (optional smoke for `servicesDown` / diskCritical wiring via exported helpers if any; prefer keeping OS I/O unmocked and covered by manual check)

**Interfaces:**
- Consumes: types + helpers from `src/lib/server-health.ts`; `BASE_PATH` from `src/lib/base-path.ts`; `prisma` from `src/lib/db.ts`; `mailConfig` / `isMailConfigured` from `src/lib/mail.ts`
- Produces: `collectServerHealth(): Promise<ServerHealthReport>`

- [ ] **Step 1: Implement collector**

Implement `src/lib/server-health-collect.ts` with these behaviors:

1. **Addresses:** `os.networkInterfaces()` — non-internal IPv4/IPv6; if empty, include `127.0.0.1` as fallback detail.
2. **Memory / load / uptime / hostname:** `os.freemem()`, `os.totalmem()`, `os.loadavg()`, `os.uptime()`, `os.hostname()`.
3. **Database:** time `prisma.$queryRaw\`SELECT 1\``; on success optional `SELECT version()`; on failure set `connected: false` and `error` message (safe, no secrets). Merge `parseDatabaseUrlIdentity(process.env.DATABASE_URL)`.
4. **Services array:**
   - `app`: `running` (this process is answering) with detail `uptime ${process.uptime()}s`
   - `postgres`: mirror database connected → `running`/`down`
   - `smtp`: if `mailConfig()` then try `nodemailer.createTransport(...).verify()` with a short timeout (~3s); if only outbox (`isMailConfigured()` but no SMTP) mark `running` with detail `outbox`; if neither → `down` or `unknown` with detail `not configured`
   - `port`: check listen on `Number(process.env.PORT || 43123)` via `net.createServer` bind attempt on `127.0.0.1` **or** better: try connecting with `net.connect` to that port; `running` if connect succeeds
5. **Disks:** use `fs.promises.statfs` (Node) on `process.cwd()` (and optionally `/` on Linux). Build `HealthDisk` with `diskPercentUsed`. If `statfs` unavailable, return `[]` and do not throw.
6. **Processor:** try reading Linux `/sys/class/thermal/thermal_zone*/temp` (millidegrees → °C). If none, `{ available: false, detail: "No temperature sensor found", load: os.loadavg(), cores: os.cpus().length }`.
7. **API path:**
   - `basePath = BASE_PATH`, `expectedPrefix = `${BASE_PATH}/api``
   - `configuredOk = apiPathConfiguredOk(...)`
   - Live probes (localhost, short timeout ~2s):  
     - `GET http://127.0.0.1:${PORT}${BASE_PATH}/api/admin/health/ping` → `ok` if status is 200, 401, or 403 (route exists under basePath)  
     - `GET http://127.0.0.1:${PORT}/api/admin/health/ping` → `ok` if status is **not** 200/401/403 (404/network fail means bare `/api` is correctly absent). For confirmation UX: treat first probe success + second probe failure as Pass; invert for Fail.
   - Define probe `ok` meaning “matches expectation”:  
     - arso probe: `ok: true` when reachable (2xx/401/403)  
     - bare probe: `ok: true` when **not** reachable as an app route (connection error or 404)
8. **Aggregate:**  
   - `servicesDown` = any of `app`/`smtp`/`port` is `down` (postgres mirrored in database; do not double-count for degraded if already down via DB — still list it). Spec: DB disconnect → `down`. Other service downs → `degraded`.  
   - `diskCritical` = any disk `percentUsed >= DISK_CRITICAL_PERCENT`  
   - `apiPathFail` = `!configuredOk` OR any probe with `ok === false`  
   - `status = aggregateHealthStatus({ databaseConnected, servicesDown, diskCritical, apiPathFail })`

Keep each probe in try/catch so one failure never aborts the report.

Skeleton:

```ts
import os from "os";
import net from "net";
import { promises as fs } from "fs";
import { createTransport } from "nodemailer";
import { prisma } from "@/lib/db";
import { BASE_PATH } from "@/lib/base-path";
import { mailConfig, isMailConfigured } from "@/lib/mail";
import {
  aggregateHealthStatus,
  apiPathConfiguredOk,
  diskPercentUsed,
  DISK_CRITICAL_PERCENT,
  parseDatabaseUrlIdentity,
  type ServerHealthReport,
  type HealthService,
  type HealthDisk,
  type HealthProcessor,
  type HealthApiPath,
  type HealthDatabase,
} from "@/lib/server-health";

export async function collectServerHealth(): Promise<ServerHealthReport> {
  // ... implement per rules above
}
```

- [ ] **Step 2: Implement ping route first if not yet present** (needed for live probes; can be Task 3 Step 1 — if collecting before Task 3, temporarily mark probes `unknown` / skip live fetch until ping exists). Prefer implementing ping in Task 3 before enabling live probes; in this task stub probes as empty array **or** implement ping now as part of this task:

Create `src/app/api/admin/health/ping/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canOpenAdmin(session.user) || !can(session.user, "audit:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
```

Note: live probe from the same machine may not send cookies — treat **any HTTP response** from the arso path (including 401) as “route mounted”, and **404 / network error** on bare `/api` as expected. Adjust `ok` rules accordingly: arso probe ok on status < 500 and !== 404; bare probe ok when status === 404 OR fetch throws.

- [ ] **Step 3: Smoke-check collector in Node REPL or a one-off** (optional)

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npx tsx -e "import { collectServerHealth } from './src/lib/server-health-collect.ts'; collectServerHealth().then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error)"`  
Expected: JSON with `status`, `database`, `disks`, etc. (may need dotenv — if fails on env, skip and rely on API task)

- [ ] **Step 4: Commit**

```bash
cd /home/acap/ACAP_TL/ACAP_TL
git add src/lib/server-health-collect.ts src/app/api/admin/health/ping/route.ts
git commit -m "$(cat <<'EOF'
feat(admin): collect server health diagnostics

EOF
)"
```

---

### Task 3: Health API route

**Files:**
- Create: `src/app/api/admin/health/route.ts`

**Interfaces:**
- Consumes: `collectServerHealth()`, `getSessionUser`, `can`, `canOpenAdmin`
- Produces: `GET` → `200` + `ServerHealthReport` | `401` | `403`

- [ ] **Step 1: Implement route**

```ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";
import { collectServerHealth } from "@/lib/server-health-collect";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canOpenAdmin(session.user) || !can(session.user, "audit:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const report = await collectServerHealth();
  return NextResponse.json(report);
}
```

- [ ] **Step 2: Manual auth check** (dev server running)

Run (signed-out): `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:43123/arso/api/admin/health`  
Expected: `401` or `403`

- [ ] **Step 3: Commit**

```bash
cd /home/acap/ACAP_TL/ACAP_TL
git add src/app/api/admin/health/route.ts
git commit -m "$(cat <<'EOF'
feat(admin): expose GET /api/admin/health

EOF
)"
```

---

### Task 4: Health client UI (tabs)

**Files:**
- Create: `src/app/[locale]/admin/health/health-client.tsx`

**Interfaces:**
- Consumes: `ServerHealthReport` type; `apiFetch("/api/admin/health")`; `DeskTabs` from `@/app/[locale]/cb/desk-tabs`
- Produces: client component that loads report, shows badge + Refresh, tabs for Overview / Services / Database / Storage / Processor / API path

- [ ] **Step 1: Implement client**

Create `health-client.tsx` as a `"use client"` module:

- On mount + Refresh: `apiFetch("/api/admin/health")` → JSON as `ServerHealthReport`
- Show loading / error inline
- Header: status badge (`healthy` green-ish via accent, `degraded` amber text, `down` destructive if token exists else bold red), `collectedAt`, Refresh button
- Optional: `setInterval` 30s refresh; clear on unmount
- `DeskTabs` with `syncHash` so `#database` etc. deep-link; **do not** use `keepMounted` (only active tab content — keeps page short)
- Tab panels (compact definition lists / tables, reuse admin typography):

**Overview:** status, uptime (format seconds as `Xd Xh Xm`), hostname, addresses join, memory used/total, loadavg  
**Services:** table/rows of label + state + detail  
**Database:** Connected yes/no, latencyMs, host, database, serverVersion, error  
**Storage:** each disk — mount, used/free/total (human bytes), percent bar (`width: percent%`), warn style if `>= 90`  
**Processor:** if `available` show temps °C + cores/load; else muted “No temperature sensor found” + still show load/cores  
**API path:** show `basePath`, `expectedPrefix`, `configuredOk` Pass/Fail; list probes with path + ok + statusCode; overall Pass only if configuredOk and every probe.ok

Helper for bytes (inline in file is fine):

```ts
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n;
  let i = -1;
  do {
    v /= 1024;
    i++;
  } while (v >= 1024 && i < units.length - 1);
  return `${v.toFixed(1)} ${units[i]}`;
}
```

Use existing CSS variables; avoid new purple themes / card stacks. Prefer simple bordered rows (`border-[var(--line)]`).

- [ ] **Step 2: Typecheck sanity**

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npx tsc --noEmit -p tsconfig.json 2>&1 | head -40`  
Expected: no errors in new health files (fix pre-existing noise)

- [ ] **Step 3: Commit**

```bash
cd /home/acap/ACAP_TL/ACAP_TL
git add src/app/[locale]/admin/health/health-client.tsx
git commit -m "$(cat <<'EOF'
feat(admin): add tabbed server health client UI

EOF
)"
```

---

### Task 5: Page route + admin nav

**Files:**
- Create: `src/app/[locale]/admin/health/page.tsx`
- Modify: `src/app/[locale]/admin/admin-chrome.tsx` (nav array — after Audit or near Overview)

**Interfaces:**
- Consumes: `getSessionUser`, `can`, `canOpenAdmin`, `isLocale`, `ClientRedirect`, `HealthClient`
- Produces: `/[locale]/admin/health` page; nav item **Server health**

- [ ] **Step 1: Create page**

```tsx
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { ClientRedirect } from "@/components/admin/client-redirect";
import { HealthClient } from "./health-client";

export default async function AdminHealthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const session = await getSessionUser();
  if (!session) return <ClientRedirect href={`/${locale}/login?next=/${locale}/admin/health`} />;
  if (!canOpenAdmin(session.user) || !can(session.user, "audit:read")) notFound();
  return (
    <div>
      <p className="text-sm text-[var(--muted)]">Host diagnostics for this ACAP Trade node (uptime, services, disk, CPU, API path).</p>
      <div className="mt-6">
        <HealthClient />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add nav link in `admin-chrome.tsx`**

Inside the `nav` array, after the Audit entry (or before it), add:

```ts
{
  href: `/${locale}/admin/health`,
  label: "Server health",
  show: systemAdmin && can(session.user, "audit:read"),
},
```

Note: `systemAdmin` already means `canOpenAdmin`; pairing with `audit:read` matches the spec.

- [ ] **Step 3: Browser checklist**

Against `https://acap.arso-oran.org/arso/en/admin/health` or local `http://127.0.0.1:43123/arso/en/admin/health`:

- [ ] Nav shows **Server health** for privileged admin
- [ ] Unprivileged user cannot open page
- [ ] Tabs switch without a long single page
- [ ] Database tab shows connected + latency
- [ ] API path tab shows Pass for `/arso/api` confirmation
- [ ] Processor tab does not crash if no sensor
- [ ] Refresh updates `collectedAt`

- [ ] **Step 4: Run unit tests**

Run: `cd /home/acap/ACAP_TL/ACAP_TL && npx vitest run tests/server-health.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/acap/ACAP_TL/ACAP_TL
git add src/app/[locale]/admin/health/page.tsx src/app/[locale]/admin/admin-chrome.tsx
git commit -m "$(cat <<'EOF'
feat(admin): wire server health page and nav

EOF
)"
```

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Tabbed UI (Overview, Services, Database, Storage, Processor, API path) | 4, 5 |
| Uptime, IPs, server state | 2, 4 |
| Services running/not | 2, 4 |
| Database connection status | 2, 4 |
| Disk used/remaining | 2, 4 |
| Processor temp tab | 2, 4 |
| API path A+B confirmation | 1, 2, 4 |
| Auth system admin + audit:read | 3, 5 |
| No schema changes | Global constraint |
| Neat tabs / not long page | DeskTabs without keepMounted |

No placeholders left; types consistent across `ServerHealthReport` consumers.
`}