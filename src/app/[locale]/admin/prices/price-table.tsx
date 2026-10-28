"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyCrud } from "@/components/ui/crud-notice";
import { DISTRIBUTIONS, distributionLabel, type Distribution } from "@/lib/catalog-access";

export type TariffChip = {
  id: string;
  code: string;
  description: string;
  recCode: string;
  recName: string;
};

export type PriceRow = {
  versionId: string;
  designation: string;
  title: string;
  edition: string;
  amount: string;
  currency: string;
  active: boolean;
  distribution: Distribution;
  tariffs: TariffChip[];
};

const CURRENCIES = ["USD", "EUR", "KES", "UGX", "TZS", "RWF", "ZAR", "NGN", "GHS", "XOF", "XAF"];

function TariffLineTip({ line }: { line: TariffChip }) {
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);

  function show(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setPlace({ x: rect.left, y: rect.bottom + 8 });
  }

  return (
    <span className="inline-flex">
      <button
        type="button"
        className="rounded-md border border-[var(--line)] bg-white px-2 py-1 font-mono text-sm text-[var(--ink)] underline decoration-dotted underline-offset-2"
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setPlace(null)}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={() => setPlace(null)}
      >
        {line.code}
        <span className="font-sans"> · {line.recCode}</span>
      </button>
      {place ? (
        <span
          role="tooltip"
          className="fixed z-50 w-80 rounded-md border border-[var(--line)] bg-white p-3 text-left text-base text-[var(--ink)] shadow-lg"
          style={{ left: place.x, top: place.y }}
        >
          <span className="font-semibold">
            {line.recCode} — {line.recName}
          </span>
          <span className="mt-1 block">{line.description || "No description recorded for this line."}</span>
          <span className="mt-2 block text-sm">
            This tariff line applies in {line.recName} ({line.recCode}).
          </span>
        </span>
      ) : null}
    </span>
  );
}

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
        amount: row.distribution === "PAID" ? row.amount : "0",
        currency: row.currency,
        active: row.active,
        distribution: row.distribution,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      notifyCrud("error", data.error || "Price could not be saved");
      return;
    }
    notifyCrud("updated", `${row.designation} listing saved`);
    router.refresh();
  }

  if (!rows.length) {
    return <p className="text-base text-[var(--ink)]">No standards uploaded yet. Import one, then set its price here.</p>;
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-base text-[var(--ink)]">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]">
            <th className="px-4 py-2 font-semibold">Standard</th>
            <th className="px-4 py-2 font-semibold">Tariff lines</th>
            <th className="px-4 py-2 font-semibold">Offer</th>
            <th className="px-4 py-2 font-semibold">Price</th>
            <th className="px-4 py-2 font-semibold">Currency</th>
            <th className="px-4 py-2 font-semibold">Webstore</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draft = drafts[row.versionId] || row;
            const priced = draft.distribution === "PAID";
            return (
              <tr key={row.versionId} className="border-b border-[var(--line)] align-top">
                <td className="px-4 py-3">
                  <div className="font-mono font-medium">{draft.designation}</div>
                  <div>{draft.title}</div>
                  <div className="text-sm">{draft.edition}</div>
                </td>
                <td className="px-4 py-3">
                  {draft.tariffs.length ? (
                    <div className="flex max-w-xs flex-wrap gap-1.5">
                      {draft.tariffs.map((line) => (
                        <TariffLineTip key={line.id} line={line} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm">No tariff lines mapped</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-1.5">
                    {DISTRIBUTIONS.map((value) => (
                      <label key={value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`offer-${row.versionId}`}
                          disabled={!canWrite}
                          checked={draft.distribution === value}
                          onChange={() => patch(row.versionId, { distribution: value })}
                        />
                        {distributionLabel(value)}
                      </label>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={!canWrite || !priced}
                    value={priced ? draft.amount : "0.00"}
                    placeholder="0.00"
                    onChange={(e) => patch(row.versionId, { amount: e.target.value })}
                    className="w-32"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={!canWrite || !priced}
                    value={draft.currency}
                    onChange={(e) => patch(row.versionId, { currency: e.target.value })}
                    className="h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base text-[var(--ink)]"
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
                      {busyId === row.versionId ? "Saving…" : "Save"}
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
