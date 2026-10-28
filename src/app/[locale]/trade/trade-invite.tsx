"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TradeInvite({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const assign = await fetch("/api/org/assign-existing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "ORG_VIEWER", organizationId }),
    });
    const assigned = await assign.json().catch(() => ({}));
    if (assign.ok) {
      setBusy(false);
      setEmail("");
      setMessage(assigned.message || "View-only access added");
      router.refresh();
      return;
    }
    if (assign.status !== 404) {
      setBusy(false);
      setError(assigned.error || "Could not add that account");
      return;
    }
    const invite = await fetch("/api/org/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "ORG_VIEWER", organizationId }),
    });
    const invited = await invite.json().catch(() => ({}));
    setBusy(false);
    if (!invite.ok) {
      setError(invited.error || "Invitation could not be sent");
      return;
    }
    setEmail("");
    setMessage(invited.message || "Invitation sent");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <Label htmlFor={`invite-${organizationId}`}>Invite a view-only account</Label>
        <Input
          id={`invite-${organizationId}`}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@example.com"
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Invite view only"}
      </Button>
      {message && <p className="text-sm text-emerald-800">{message}</p>}
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </form>
  );
}
