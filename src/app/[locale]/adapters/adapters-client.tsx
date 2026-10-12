"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdaptersClient({
  locale,
  initialRec,
  initialTariff,
}: {
  locale: string;
  initialRec: string;
  initialTariff: string;
}) {
  const router = useRouter();
  const [rec, setRec] = useState(initialRec);
  const [tariff, setTariff] = useState(initialTariff);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function lookup() {
    const qs = new URLSearchParams({ rec, tariff });
    router.push(`/${locale}/adapters?${qs.toString()}`);
  }

  async function drain() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/adapters/${encodeURIComponent(rec)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "drain_outbox" }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(`Delivered ${data.delivered ?? 0} outbox event(s) to ${rec}`);
    router.refresh();
  }

  async function offlineCache() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/adapters/offline-cache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryPointCode: "KE-NAMANGA" }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(data.message || data.error);
    router.refresh();
  }

  return (
    <div className="panel mt-8 space-y-3 p-5">
      <form
        method="get"
        action={`/${locale}/adapters`}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="rec">
            REC adapter
          </label>
          <select
            id="rec"
            name="rec"
            className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
            value={rec}
            onChange={(e) => setRec(e.target.value)}
          >
            <option value="EAC">EAC</option>
            <option value="ECOWAS">ECOWAS</option>
            <option value="COMESA">COMESA</option>
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="tariff">
            Tariff
          </label>
          <Input id="tariff" name="tariff" value={tariff} onChange={(e) => setTariff(e.target.value)} />
        </div>
        <Button type="submit">Query adapter</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} variant="secondary" onClick={drain}>
          Drain webhook outbox
        </Button>
        <Button disabled={busy} variant="outline" onClick={offlineCache}>
          Build signed offline cache (Namanga)
        </Button>
      </div>
      {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
    </div>
  );
}
