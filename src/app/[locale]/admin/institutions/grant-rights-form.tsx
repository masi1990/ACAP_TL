"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { notifyCrud } from "@/components/ui/crud-notice";
import { AUTHORITY_LABELS, AUTHORITY_TYPES } from "@/lib/rbac";

export type GrantAccount = {
  email: string;
  label: string;
  institutionName: string;
  memberStateId: string;
};

export function GrantRightsForm({
  accounts,
  countries,
}: {
  accounts: GrantAccount[];
  countries: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("CB");
  const [memberStateId, setMemberStateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function chooseAccount(next: string) {
    setEmail(next);
    const account = accounts.find((item) => item.email === next);
    if (!account) return;
    setName(account.institutionName);
    setMemberStateId(account.memberStateId);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/admin/institution-rights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, type, memberStateId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Request failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setEmail("");
    setName("");
    setType("CB");
    setMemberStateId("");
    setMsg("Created");
    notifyCrud("created");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="panel grid max-w-2xl gap-3 p-4">
      <div className="grid gap-1">
        <Label htmlFor="grant-rights-email">Existing account</Label>
        <div className="relative">
          <SearchSelect
            id="grant-rights-email"
            value={email}
            onChange={chooseAccount}
            placeholder={accounts.length === 0 ? "No accounts yet" : "Select an account"}
            searchPlaceholder="Search email, name, or organisation"
            options={accounts.map((account) => ({ value: account.email, label: account.label }))}
          />
          <input
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            value={email}
            required
            onChange={() => undefined}
          />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="grant-rights-name">Institution name</Label>
        <Input id="grant-rights-name" value={name} required onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="grant-rights-type">Type</Label>
        <select
          id="grant-rights-type"
          required
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
        >
          {AUTHORITY_TYPES.map((value) => (
            <option key={value} value={value}>
              {AUTHORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="grant-rights-country">Country</Label>
        <div className="relative">
          <SearchSelect
            id="grant-rights-country"
            value={memberStateId}
            onChange={setMemberStateId}
            placeholder="Select a country"
            searchPlaceholder="Search country"
            options={countries}
          />
          <input
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            value={memberStateId}
            required
            onChange={() => undefined}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Grant rights"}
        </Button>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      </div>
    </form>
  );
}
