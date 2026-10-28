"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Institution = {
  id: string;
  name: string;
  type: string;
  backing: string;
  alsoCertifies: boolean;
  homeCountryId: string | null;
  homeCountryName: string;
  countries: { id: string; name: string }[];
};

export function RoleRequestForm({
  institutions,
  organizationId,
  memberStateId,
}: {
  institutions: Institution[];
  organizationId: string;
  memberStateId: string;
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(organizationId);
  const [countryId, setCountryId] = useState(memberStateId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const org = useMemo(() => institutions.find((item) => item.id === orgId), [institutions, orgId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/library/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId, memberStateId: countryId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send the request");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3">
      <label className="grid gap-1 text-sm">
        Institution
        <select
          required
          value={orgId}
          onChange={(event) => {
            setOrgId(event.target.value);
            setCountryId("");
          }}
          className="rounded-md border border-[var(--line)] px-3 py-2"
        >
          <option value="">Choose</option>
          {institutions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.type === "NSB" ? " — national standards body" : item.backing === "PRIVATE" ? " — private certification body" : " — certification body"}
              {item.alsoCertifies ? " (also certifies)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Country you represent
        <select required value={countryId} onChange={(event) => setCountryId(event.target.value)} className="rounded-md border border-[var(--line)] px-3 py-2">
          <option value="">Choose</option>
          {(org?.countries || []).map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button disabled={busy} className="w-fit rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">{busy ? "Sending…" : "Request standards officer"}</button>
    </form>
  );
}
