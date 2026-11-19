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
  type HealthApiProbe,
  type HealthDatabase,
} from "@/lib/server-health";

const SMTP_TIMEOUT_MS = 3000;
const PROBE_TIMEOUT_MS = 2000;
const PORT_TIMEOUT_MS = 1500;
const SMTP_CACHE_TTL_MS = 5 * 60 * 1000;

/** Module-level cache so the 30s poll doesn't open an SMTP connection each time. */
let smtpCache: { key: string; at: number; result: HealthService } | null = null;
let smtpInFlight: { key: string; promise: Promise<HealthService> } | null = null;

function appPort(): number {
  const n = Number(process.env.PORT || 43123);
  return Number.isFinite(n) && n > 0 ? n : 43123;
}

/** Short, secret-free error text. */
function safeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return (
    raw
      // Strip connection URLs / credentials if a driver echoes them.
      .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s'"]+/gi, "[url]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || "Unknown error"
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function collectAddresses(): string[] {
  const out: string[] = [];
  try {
    const nets = os.networkInterfaces();
    for (const infos of Object.values(nets)) {
      for (const info of infos ?? []) {
        if (info.internal) continue;
        if (info.family !== "IPv4" && info.family !== "IPv6") continue;
        if (!out.includes(info.address)) out.push(info.address);
      }
    }
  } catch {
    // fall through to fallback
  }
  if (out.length === 0) out.push("127.0.0.1");
  return out;
}

async function collectDatabase(): Promise<HealthDatabase> {
  const identity = parseDatabaseUrlIdentity(process.env.DATABASE_URL);
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const db: HealthDatabase = {
      connected: true,
      latencyMs: Date.now() - started,
      ...identity,
    };
    try {
      const rows = await prisma.$queryRaw<{ version: string }[]>`SELECT version() AS version`;
      const version = rows?.[0]?.version;
      if (version) db.serverVersion = String(version).slice(0, 120);
    } catch {
      // version is optional
    }
    return db;
  } catch (err) {
    return { connected: false, error: safeError(err), ...identity };
  }
}

function checkPort(port: number): Promise<HealthService> {
  return new Promise((resolve) => {
    const base = { id: "port", label: `Port ${port}` };
    let settled = false;
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (state: HealthService["state"], detail: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...base, state, detail });
    };
    socket.setTimeout(PORT_TIMEOUT_MS);
    socket.once("connect", () => done("running", `Listening on 127.0.0.1:${port}`));
    socket.once("timeout", () => done("down", "Connection timed out"));
    socket.once("error", (err) => done("down", safeError(err)));
  });
}

async function checkSmtp(): Promise<HealthService> {
  const base = { id: "smtp", label: "SMTP" };
  try {
    const cfg = mailConfig();
    if (cfg) {
      const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
      if (smtpCache && smtpCache.key === key && Date.now() - smtpCache.at < SMTP_CACHE_TTL_MS) {
        return smtpCache.result;
      }
      if (smtpInFlight && smtpInFlight.key === key) return smtpInFlight.promise;
      const promise = verifySmtp(cfg, key).finally(() => {
        if (smtpInFlight?.promise === promise) smtpInFlight = null;
      });
      smtpInFlight = { key, promise };
      return promise;
    }
    if (isMailConfigured()) return { ...base, state: "running", detail: "outbox" };
    return { ...base, state: "unknown", detail: "not configured" };
  } catch (err) {
    return { ...base, state: "unknown", detail: safeError(err) };
  }
}

async function verifySmtp(
  cfg: NonNullable<ReturnType<typeof mailConfig>>,
  key: string,
): Promise<HealthService> {
  const base = { id: "smtp", label: "SMTP" };
  const transport = createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  let result: HealthService;
  try {
    await withTimeout(transport.verify(), SMTP_TIMEOUT_MS, "SMTP verify");
    result = { ...base, state: "running", detail: `${cfg.host}:${cfg.port}` };
  } catch (err) {
    result = { ...base, state: "down", detail: safeError(err) };
  } finally {
    transport.close();
  }
  smtpCache = { key, at: Date.now(), result };
  return result;
}

async function collectServices(
  database: HealthDatabase,
  port: number,
): Promise<HealthService[]> {
  const app: HealthService = {
    id: "app",
    label: "Application",
    state: "running",
    detail: `uptime ${Math.round(process.uptime())}s`,
  };
  const postgres: HealthService = {
    id: "postgres",
    label: "PostgreSQL",
    state: database.connected ? "running" : "down",
    detail: database.connected ? undefined : database.error,
  };
  const [smtp, portService] = await Promise.all([
    checkSmtp().catch(
      (err): HealthService => ({ id: "smtp", label: "SMTP", state: "unknown", detail: safeError(err) }),
    ),
    checkPort(port).catch(
      (err): HealthService => ({ id: "port", label: `Port ${port}`, state: "unknown", detail: safeError(err) }),
    ),
  ]);
  return [app, postgres, smtp, portService];
}

async function diskFor(mount: string): Promise<HealthDisk | null> {
  try {
    if (typeof fs.statfs !== "function") return null;
    const s = await fs.statfs(mount);
    const bsize = Number(s.bsize);
    const totalBytes = Number(s.blocks) * bsize;
    const freeBytes = Number(s.bavail) * bsize;
    const usedBytes = Math.max(0, totalBytes - Number(s.bfree) * bsize);
    return {
      mount,
      usedBytes,
      freeBytes,
      totalBytes,
      percentUsed: diskPercentUsed(usedBytes, usedBytes + freeBytes),
    };
  } catch {
    return null;
  }
}

async function collectDisks(): Promise<HealthDisk[]> {
  try {
    const mounts = [process.cwd()];
    if (process.platform === "linux" && process.cwd() !== "/") mounts.push("/");
    const disks: HealthDisk[] = [];
    const seen = new Set<string>();
    for (const mount of mounts) {
      const disk = await diskFor(mount);
      if (!disk) continue;
      // cwd and / often share a filesystem; avoid duplicate rows.
      const key = `${disk.totalBytes}:${disk.freeBytes}`;
      if (seen.has(key)) continue;
      seen.add(key);
      disks.push(disk);
    }
    return disks;
  } catch {
    return [];
  }
}

async function collectProcessor(): Promise<HealthProcessor> {
  const load = os.loadavg();
  let cores = 0;
  try {
    cores = os.cpus().length;
  } catch {
    // ignore
  }
  try {
    if (process.platform === "linux") {
      const base = "/sys/class/thermal";
      const entries = await fs.readdir(base);
      const zones = entries.filter((e) => /^thermal_zone\d+$/.test(e));
      const temps: number[] = [];
      for (const zone of zones) {
        try {
          const raw = await fs.readFile(`${base}/${zone}/temp`, "utf8");
          const milli = Number(raw.trim());
          if (Number.isFinite(milli)) temps.push(Math.round(milli) / 1000);
        } catch {
          // zone without readable temp
        }
      }
      if (temps.length > 0) {
        return { available: true, tempsC: temps, load, cores };
      }
    }
  } catch {
    // no thermal sysfs
  }
  return { available: false, detail: "No temperature sensor found", load, cores };
}

async function probe(
  path: string,
  expectation: "mounted" | "absent",
): Promise<HealthApiProbe> {
  const url = `http://127.0.0.1:${appPort()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    // Drain/cancel the body so the socket is released.
    void res.body?.cancel().catch(() => {});
    const statusCode = res.status;
    if (expectation === "mounted") {
      const ok = statusCode < 500 && statusCode !== 404;
      return {
        path,
        ok,
        statusCode,
        detail: ok ? "Route mounted under basePath" : "Route not found under basePath",
      };
    }
    const ok = statusCode === 404;
    return {
      path,
      ok,
      statusCode,
      detail: ok ? "Bare /api correctly absent" : "Bare /api unexpectedly reachable",
    };
  } catch (err) {
    if (expectation === "absent") {
      return { path, ok: true, detail: "Bare /api not reachable (expected)" };
    }
    return { path, ok: false, detail: safeError(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function collectApiPath(): Promise<HealthApiPath> {
  const basePath = BASE_PATH;
  const expectedPrefix = `${BASE_PATH}/api`;
  const configuredOk = apiPathConfiguredOk(basePath, expectedPrefix);
  const probes = await Promise.all([
    probe(`${BASE_PATH}/api/admin/health/ping`, "mounted"),
    probe(`/api/admin/health/ping`, "absent"),
  ]).catch(() => [] as HealthApiProbe[]);
  return { basePath, expectedPrefix, configuredOk, probes };
}

export async function collectServerHealth(): Promise<ServerHealthReport> {
  const port = appPort();

  const database = await collectDatabase();
  const [services, disks, processor, apiPath] = await Promise.all([
    collectServices(database, port),
    collectDisks(),
    collectProcessor(),
    collectApiPath(),
  ]);

  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();

  const servicesDown = services.some(
    (s) => (s.id === "app" || s.id === "smtp" || s.id === "port") && s.state === "down",
  );
  const diskCritical = disks.some((d) => d.percentUsed >= DISK_CRITICAL_PERCENT);
  const apiPathFail = !apiPath.configuredOk || apiPath.probes.some((p) => p.ok === false);

  return {
    status: aggregateHealthStatus({
      databaseConnected: database.connected,
      servicesDown,
      diskCritical,
      apiPathFail,
    }),
    collectedAt: new Date().toISOString(),
    uptimeSeconds: Math.round(os.uptime()),
    hostname: os.hostname(),
    addresses: collectAddresses(),
    memory: { freeBytes, totalBytes, usedBytes: Math.max(0, totalBytes - freeBytes) },
    load: os.loadavg(),
    services,
    database,
    disks,
    processor,
    apiPath,
  };
}
