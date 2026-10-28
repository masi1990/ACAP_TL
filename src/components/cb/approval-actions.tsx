"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notifyCrud } from "@/components/ui/crud-notice";

export function ApprovalActions({ kind, id }: { kind: "client" | "product"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);

  async function send(decision: "accept" | "reject") {
    setBusy(decision);
    const res = await fetch("/api/cb/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, decision }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      notifyCrud("error", data.error || "Request failed");
      return;
    }
    notifyCrud("updated", decision === "accept" ? "Accepted" : "Rejected");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent-fg)] disabled:opacity-60"
        disabled={busy != null}
        onClick={() => send("accept")}
      >
        {busy === "accept" ? "Accepting…" : "Accept"}
      </button>
      <button
        type="button"
        className="rounded-md border border-[var(--line)] px-2 py-1 text-xs disabled:opacity-60"
        disabled={busy != null}
        onClick={() => send("reject")}
      >
        {busy === "reject" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
