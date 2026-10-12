"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyCrud } from "@/components/ui/crud-notice";

export type PriceRow = {
  versionId: string;
  designation: string;
  title: string;
  edition: string;
  amount: string;
  currency: string;
  active: boolean;
};

const CURRENCIES = ["USD", "EUR", "KES", "UGX", "TZS", "RWF", "ZAR", "NGN", "GHS", "XOF", "XAF"];

export function PriceTable({ rows, canWrite }: { rows: PriceRow[]; canWrite: boolean }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, PriceRow>>(() =>
    Object.fromEntries(rows.map((row) => [row.versionId, row])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  function patch(versionId: string, next: Partial<PriceRow>) {
    setDrafts((current) => ({ ...current, [versionId]: { ...current[versionId], ...next } }));
  }

  async function save(versionId: string) {
    const row = drafts[versionId];
    if (!row) return;
    setBusyId(versionId);
    const res = await fetch("/api/admin/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        standardVersionId: versionId,
        amount: row.amount,
        currency: row.currency,
        active: row.active,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      notifyCrud("error", data.error || "Price could not be saved");
      return;
    }
    notifyCrud("updated", `${row.designation} price saved`);
    router.refresh();
  }

  if (!rows.length) {
    return <p className="text-sm text-[var(--muted)]">No standards uploaded yet. Import one, then set its price here.</p>;
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
            <th className="px-4 py-2">Standard</th>
            <th className="px-4 py-2">Price</th>
            <th className="px-4 py-2">Currency</th>
            <th className="px-4 py-2">Webstore</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draft = drafts[row.versionId] || row;
            return (
              <tr key={row.versionId} className="border-b border-[var(--line)] align-top">
                <td className="px-4 py-3">
                  <div className="font-mono font-medium">{draft.designation}</div>
                  <div className="text-[var(--muted)]">{draft.title}</div>
                  <div className="text-xs text-[var(--muted)]">{draft.edition}</div>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={!canWrite}
                    value={draft.amount}
                    placeholder="0.00"
                    onChange={(e) => patch(row.versionId, { amount: e.target.value })}
                    className="w-32"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={!canWrite}
                    value={draft.currency}
                    onChange={(e) => patch(row.versionId, { currency: e.target.value })}
                    className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={!canWrite}
                      checked={draft.active}
                      onChange={(e) => patch(row.versionId, { active: e.target.checked })}
                    />
                    Listed
                  </label>
                </td>
                <td className="px-4 py-3 text-right">
                  {canWrite && (
                    <Button type="button" disabled={busyId === row.versionId} onClick={() => void save(row.versionId)}>
                      {busyId === row.versionId ? "Saving…" : "Save price"}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
