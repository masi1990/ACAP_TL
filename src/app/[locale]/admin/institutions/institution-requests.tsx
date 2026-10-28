"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notifyCrud } from "@/components/ui/crud-notice";

export type InstitutionRequestRow = {
  id: string;
  name: string;
  typeLabel: string;
  country: string;
  email: string;
};

export function InstitutionRequests({ rows }: { rows: InstitutionRequestRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (!rows.length) return null;

  async function send(id: string, decision: "approve" | "reject") {
    setBusy(`${id}:${decision}`);
    const res = await fetch(`/api/admin/institution-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      notifyCrud("error", data.error || "Request failed");
      return;
    }
    notifyCrud("updated", decision === "approve" ? "Institution created" : "Request rejected");
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Requests from manufacturer accounts</h2>
      <p className="max-w-3xl text-sm text-[var(--muted)]">
        Approval adds a new institution and makes the requester its organisation admin. Their manufacturer company
        stays on the same login. A certification body receives an approved Quality Mark licence.
      </p>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]">
              <th className="px-4 py-2">Institution</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Account</th>
              <th className="px-4 py-2">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--line)]">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.typeLabel}</td>
                <td className="px-4 py-3">{row.country}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent-fg)] disabled:opacity-60"
                      disabled={busy != null}
                      onClick={() => send(row.id, "approve")}
                    >
                      {busy === `${row.id}:approve` ? "Approving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--line)] px-2 py-1 text-xs disabled:opacity-60"
                      disabled={busy != null}
                      onClick={() => send(row.id, "reject")}
                    >
                      {busy === `${row.id}:reject` ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
