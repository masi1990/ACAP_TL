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
