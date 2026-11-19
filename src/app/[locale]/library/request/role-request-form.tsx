"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/base-path";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";

type Institution = {
  id: string;
  name: string;
  type: string;
  backing: string;
  alsoCertifies: boolean;
  homeCountryId: string | null;
  homeCountryName: string;
};

export function RoleRequestForm({
  institutions,
  countries,
  organizationId,
  memberStateId,
}: {
  institutions: Institution[];
  countries: { id: string; name: string }[];
  organizationId: string;
  memberStateId: string;
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(organizationId);
  const [countryId, setCountryId] = useState(memberStateId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const countryOptions = useMemo(
    () => countries.map((country) => ({ value: country.id, label: country.name })),
    [countries],
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId) {
      setError("Choose an institution");
      return;
    }
    if (!countryId) {
      setError("Choose the country you represent");
      return;
    }
    setBusy(true);
    setError("");
    const res = await apiFetch("/api/library/requests", {
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
      <div className="grid gap-1 text-sm">
        <Label htmlFor="library-request-institution">Institution</Label>
        <SearchSelect
          id="library-request-institution"
          value={orgId}
          onChange={setOrgId}
          placeholder="Select an institution"
          searchPlaceholder="Search institutions"
          options={institutions.map((item) => ({
            value: item.id,
            label:
              item.name +
              (item.type === "NSB"
                ? " — national standards body"
                : item.backing === "PRIVATE"
                  ? " — private certification body"
                  : " — certification body") +
              (item.alsoCertifies ? " (also certifies)" : ""),
          }))}
        />
      </div>
      <div className="grid gap-1 text-sm">
        <Label htmlFor="library-request-country">Country you represent</Label>
        <SearchSelect
          id="library-request-country"
          value={countryId}
          onChange={setCountryId}
          placeholder="Select a country"
          searchPlaceholder="Search countries"
          options={countryOptions}
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button disabled={busy} className="w-fit rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">
        {busy ? "Sending…" : "Request standards officer"}
      </button>
    </form>
  );
}
