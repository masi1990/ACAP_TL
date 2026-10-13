"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyCrud } from "@/components/ui/crud-notice";

export function PortalActions({
  locale,
  applications,
}: {
  locale: string;
  applications: { id: string; status: string; product: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [impersonateEmail, setImpersonateEmail] = useState("");

  async function post(url: string, body?: unknown, kind: "created" | "updated" = "created") {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Action failed";
      setMsg(message);
      notifyCrud("error", message);
      return false;
    }
    const message = data.message || "Done";
    setMsg(message);
    notifyCrud(kind, message);
    router.refresh();
    return true;
  }

  const draft = applications.find((a) => a.status !== "CERTIFIED") || applications[0];

  return (
    <div className="panel mt-8 space-y-4 p-5">
      <h2 className="text-lg font-semibold">Pilot actions</h2>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} variant="outline" onClick={() => post("/api/cert/new-application")}>
          New application
        </Button>
        <Button
          disabled={busy || !draft}
          onClick={() =>
            post("/api/cert/issue-coc", {
              applicationId: draft?.id,
              idempotencyKey: `issue-${draft?.id}`,
            })
          }
        >
          Issue CoC + PINs
        </Button>
        <Button disabled={busy} variant="secondary" onClick={() => post("/api/licenses/generate-pdfs")}>
          Generate licence PDFs
        </Button>
        <Button disabled={busy} variant="secondary" onClick={() => post("/api/jobs/run-reminders")}>
          Send due notifications
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => post("/api/portfolio/transfer-stub")}>
          Portfolio transfer stub
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => post("/api/fraud/mark-misuse-stub")}>
          Mark-misuse alert stub
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-2">
          <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Invite email" />
          <Button
            disabled={busy}
            variant="secondary"
            onClick={async () => {
              const ok = await post("/api/org/invite", { email: inviteEmail, role: "ORG_USER" });
              if (ok) setInviteEmail("");
            }}
          >
            Invite user
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={impersonateEmail}
            onChange={(e) => setImpersonateEmail(e.target.value)}
            placeholder="Impersonate email"
          />
          <Button
            disabled={busy}
            variant="outline"
            onClick={() =>
              post("/api/auth/impersonate", {
                targetEmail: impersonateEmail,
                reason: "ARSO support assist (pilot)",
              })
            }
          >
            Impersonate
          </Button>
        </div>
      </div>
      {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
      <p className="text-xs text-[var(--muted)]">
        Locale context: /{locale}/portal · CoC issue is transactional with double-issue guard.
      </p>
    </div>
  );
}
