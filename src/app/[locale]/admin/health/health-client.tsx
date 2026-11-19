"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DeskTabs } from "@/app/[locale]/cb/desk-tabs";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/base-path";
import { DISK_CRITICAL_PERCENT, type HealthStatus, type ServerHealthReport } from "@/lib/server-health";

const REFRESH_MS = 30_000;
const MAX_OTHER_TEMPS = 6;

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

function formatUptime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function formatLoad(load?: number[]) {
  return load && load.length ? load.map((v) => v.toFixed(2)).join(" / ") : "—";
}

const STATUS_STYLE: Record<HealthStatus, string> = {
  healthy: "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]",
  degraded: "border-amber-600 bg-amber-50 text-amber-800",
  down: "border-red-700 bg-red-50 font-bold text-red-700",
};

function StatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function PassFail({ ok }: { ok: boolean }) {
  return <span className={ok ? "font-semibold text-[var(--accent)]" : "font-bold text-red-700"}>{ok ? "Pass" : "Fail"}</span>;
}

function Rows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-3 py-2">
          <dt className="text-[var(--muted)]">{row.label}</dt>
          <dd className="min-w-0 break-words text-[var(--ink)]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function serviceStateClass(state: string) {
  if (state === "running") return "font-semibold text-[var(--accent)]";
  if (state === "down") return "font-bold text-red-700";
  return "text-[var(--muted)]";
}

function OverviewPanel({ report }: { report: ServerHealthReport }) {
  const { memory } = report;
  const pct = memory.totalBytes > 0 ? Math.round((memory.usedBytes / memory.totalBytes) * 100) : 0;
  return (
    <Rows
      rows={[
        { label: "Status", value: <StatusBadge status={report.status} /> },
        { label: "Uptime", value: formatUptime(report.uptimeSeconds) },
        { label: "Hostname", value: report.hostname },
        { label: "Addresses", value: report.addresses.length ? report.addresses.join(", ") : "—" },
        {
          label: "Memory",
          value: `${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)} (${pct}%)`,
        },
        { label: "Load average", value: formatLoad(report.load) },
      ]}
    />
  );
}

function ServicesPanel({ report }: { report: ServerHealthReport }) {
  if (!report.services.length) return <p className="text-sm text-[var(--muted)]">No services reported.</p>;
  return (
    <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
      {report.services.map((svc) => (
        <li key={svc.id} className="grid grid-cols-[10rem_6rem_1fr] gap-3 py-2">
          <span className="text-[var(--ink)]">{svc.label}</span>
          <span className={serviceStateClass(svc.state)}>{svc.state}</span>
          <span className="min-w-0 break-words text-[var(--muted)]">{svc.detail || "—"}</span>
        </li>
      ))}
    </ul>
  );
}

function DatabasePanel({ report }: { report: ServerHealthReport }) {
  const db = report.database;
  return (
    <Rows
      rows={[
        {
          label: "Connected",
          value: <span className={db.connected ? "font-semibold text-[var(--accent)]" : "font-bold text-red-700"}>{db.connected ? "Yes" : "No"}</span>,
        },
        { label: "Latency", value: db.latencyMs != null ? `${db.latencyMs} ms` : "—" },
        { label: "Host", value: db.host || "—" },
        { label: "Database", value: db.database || "—" },
        { label: "Server version", value: db.serverVersion || "—" },
        ...(db.error ? [{ label: "Error", value: <span className="text-red-700">{db.error}</span> }] : []),
      ]}
    />
  );
}

function StoragePanel({ report }: { report: ServerHealthReport }) {
  if (!report.disks.length) return <p className="text-sm text-[var(--muted)]">No disk information available.</p>;
  return (
    <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
      {report.disks.map((disk) => {
        const warn = disk.percentUsed >= DISK_CRITICAL_PERCENT;
        const width = Math.min(100, Math.max(0, disk.percentUsed));
        return (
          <li key={disk.mount} className="space-y-1.5 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-[var(--ink)]">{disk.mount}</span>
              <span className={warn ? "font-bold text-red-700" : "text-[var(--ink)]"}>{disk.percentUsed.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--surface)]">
              <div
                className={warn ? "h-full bg-red-700" : "h-full bg-[var(--accent)]"}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="text-[var(--muted)]">
              Used {formatBytes(disk.usedBytes)} · Free {formatBytes(disk.freeBytes)} · Total {formatBytes(disk.totalBytes)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ProcessorPanel({ report }: { report: ServerHealthReport }) {
  const p = report.processor;
  const temps = p.available && p.tempsC ? p.tempsC : [];
  const sorted = [...temps].sort((a, b) => b - a);
  const max = sorted[0];
  const others = sorted.slice(1, 1 + MAX_OTHER_TEMPS);
  const hidden = Math.max(0, sorted.length - 1 - others.length);

  return (
    <div className="space-y-4">
      {p.available && max != null ? (
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Max temperature</div>
          <div className="text-3xl font-semibold text-[var(--ink)]">{max.toFixed(1)} °C</div>
          {others.length > 0 ? (
            <div className="mt-1 text-sm text-[var(--muted)]">
              Other sensors: {others.map((t) => `${t.toFixed(1)} °C`).join(", ")}
              {hidden > 0 ? ` (+${hidden} more)` : ""}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No temperature sensor found</p>
      )}
      <Rows
        rows={[
          { label: "Cores", value: p.cores != null ? String(p.cores) : "—" },
          { label: "Load average", value: formatLoad(p.load ?? report.load) },
          ...(p.detail ? [{ label: "Detail", value: p.detail }] : []),
        ]}
      />
    </div>
  );
}

function ApiPathPanel({ report }: { report: ServerHealthReport }) {
  const api = report.apiPath;
  const overallOk = api.configuredOk && api.probes.every((probe) => probe.ok);
  return (
    <div className="space-y-4">
      <Rows
        rows={[
          { label: "Overall", value: <PassFail ok={overallOk} /> },
          { label: "Base path", value: <code>{api.basePath || "(empty)"}</code> },
          { label: "Expected prefix", value: <code>{api.expectedPrefix}</code> },
          { label: "Configured", value: <PassFail ok={api.configuredOk} /> },
        ]}
      />
      {api.probes.length > 0 ? (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
          {api.probes.map((probe) => (
            <li key={probe.path} className="grid grid-cols-[1fr_5rem_4rem] gap-3 py-2">
              <span className="min-w-0 break-words">
                <code>{probe.path}</code>
                {probe.detail ? <span className="ml-2 text-[var(--muted)]">{probe.detail}</span> : null}
              </span>
              <PassFail ok={probe.ok} />
              <span className="text-[var(--muted)]">{probe.statusCode ?? "—"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function HealthClient() {
  const [report, setReport] = useState<ServerHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const inFlight = useRef(false);

  const load = useCallback(async (manual = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (manual) setLoading(true);
    try {
      const res = await apiFetch("/api/admin/health");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setReport((await res.json()) as ServerHealthReport);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health report");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the first load so no setState runs synchronously inside the effect.
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const tabs = useMemo(() => {
    if (!report) return [];
    return [
      { id: "overview", label: "Overview", content: <OverviewPanel report={report} /> },
      { id: "services", label: "Services", content: <ServicesPanel report={report} /> },
      { id: "database", label: "Database", content: <DatabasePanel report={report} /> },
      { id: "storage", label: "Storage", content: <StoragePanel report={report} /> },
      { id: "processor", label: "Processor", content: <ProcessorPanel report={report} /> },
      { id: "api-path", label: "API path", content: <ApiPathPanel report={report} /> },
    ];
  }, [report]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {report ? <StatusBadge status={report.status} /> : null}
        {report ? (
          <span className="text-sm text-[var(--muted)]">Collected {new Date(report.collectedAt).toLocaleString()}</span>
        ) : null}
        <Button type="button" variant="secondary" size="sm" className="ml-auto" onClick={() => void load(true)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {!report && loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {report ? <DeskTabs tabs={tabs} syncHash /> : null}
    </div>
  );
}
