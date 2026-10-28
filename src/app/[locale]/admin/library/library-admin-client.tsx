"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Country = { id: string; name: string };
type Institution = { id: string; name: string; countries: Country[] };
type Standard = { id: string; designation: string; titleEn: string };

export function LibraryAdminClient(props: {
  canWrite: boolean;
  institutions: Institution[];
  entryPoints: { id: string; name: string; organizationId: string | null }[];
  standards: Standard[];
  requests: { id: string; email: string; name: string; organization: string; country: string }[];
  standardRequests: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    memberStateId: string;
    organization: string;
    country: string;
    note: string;
    standardIds: string[];
  }[];
  activity: { id: string; at: string; action: string; role: string; person: string; organization: string; standard: string; language: string; posting: string }[];
  audits: { id: string; at: string; action: string; person: string }[];
  filters: { person?: string; action?: string; role?: string };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState("");
  const org = props.institutions.find((item) => item.id === orgId);

  async function post(url: string, body: unknown) {
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Request failed");
    else router.refresh();
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Library of African Standards</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Assign the standards officer role for harmonisation and adoption. A person can hold this role together with product certification and other duties.
        </p>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {props.canWrite ? (
        <form
          className="grid gap-3 rounded-xl border border-[var(--line)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            post("/api/admin/library/accounts", Object.fromEntries(form.entries()));
          }}
        >
          <h2 className="text-lg font-semibold">Create a login or assign an existing user</h2>
          <label className="grid gap-1 text-sm">Email<input name="email" type="email" required className="rounded-md border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Name, if this email is new<input name="name" className="rounded-md border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">
            Institution
            <select name="organizationId" required value={orgId} onChange={(event) => setOrgId(event.target.value)} className="rounded-md border px-3 py-2">
              <option value="">Choose</option>
              {props.institutions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Country they act for
            <select name="memberStateId" required className="rounded-md border px-3 py-2">
              <option value="">Choose</option>
              {(org?.countries || []).map((country) => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Duty station
            <select name="postingKind" className="rounded-md border px-3 py-2" defaultValue="">
              <option value="">None</option>
              <option value="REGIONAL">Regional office</option>
              <option value="BORDER">Border point</option>
              <option value="FOREIGN">Post abroad</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Office name<input name="officeName" className="rounded-md border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">
            Border point
            <select name="entryPointId" className="rounded-md border px-3 py-2" defaultValue="">
              <option value="">Choose</option>
              {props.entryPoints.filter((point) => !orgId || point.organizationId === orgId).map((point) => (
                <option key={point.id} value={point.id}>{point.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Posting country ISO<input name="postingCountry" placeholder="CN" className="rounded-md border px-3 py-2" /></label>
          <button className="w-fit rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">Save and email</button>
        </form>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Role requests</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {props.requests.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--line)] px-3 py-2">
              <span>{row.name} · {row.email} · {row.organization} · {row.country}</span>
              {props.canWrite ? (
                <span className="flex gap-2">
                  <button type="button" className="underline" onClick={() => post(`/api/admin/library/requests/${row.id}`, { decision: "approve" })}>Grant</button>
                  <button type="button" className="underline" onClick={() => post(`/api/admin/library/requests/${row.id}`, { decision: "reject" })}>Reject</button>
                </span>
              ) : null}
            </li>
          ))}
          {props.requests.length === 0 ? <li className="text-[var(--muted)]">No requests waiting.</li> : null}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Standard requests</h2>
        {props.standardRequests.map((row) => (
          <form
            key={row.id}
            className="rounded-md border border-[var(--line)] p-3 text-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
              post("/api/admin/library/releases", {
                requestId: row.id,
                decision: submitter?.value || "send",
                email: row.email,
                name: row.name,
                organizationId: row.organizationId,
                memberStateId: row.memberStateId,
                standardIds: form.getAll("standardIds"),
              });
            }}
          >
            <p>{row.name} · {row.email} · {row.organization} · {row.country}</p>
            {row.note ? <p className="text-[var(--muted)]">{row.note}</p> : null}
            <div className="mt-2 grid max-h-48 gap-1 overflow-auto">
              {props.standards.map((standard) => (
                <label key={standard.id} className="flex gap-2">
                  <input type="checkbox" name="standardIds" value={standard.id} defaultChecked={row.standardIds.includes(standard.id)} />
                  <span>{standard.designation}</span>
                </label>
              ))}
            </div>
            {props.canWrite ? (
              <div className="mt-2 flex gap-2">
                <button value="send" className="rounded-md bg-[var(--ink)] px-3 py-1 text-white">Email the selected standards</button>
                <button value="reject" className="rounded-md border px-3 py-1">Reject</button>
              </div>
            ) : null}
          </form>
        ))}
        {props.standardRequests.length === 0 ? <p className="text-sm text-[var(--muted)]">No standard requests waiting.</p> : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Activity</h2>
        <form className="mt-3 flex flex-wrap gap-2" method="get">
          <input name="person" defaultValue={props.filters.person || ""} placeholder="Person" className="rounded-md border px-3 py-2 text-sm" />
          <input name="role" defaultValue={props.filters.role || ""} placeholder="Role code" className="rounded-md border px-3 py-2 text-sm" />
          <input name="action" defaultValue={props.filters.action || ""} placeholder="Action" className="rounded-md border px-3 py-2 text-sm" />
          <button className="rounded-md border px-3 py-2 text-sm">Filter</button>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {props.activity.map((row) => (
            <li key={row.id} className="rounded-md border border-[var(--line)] px-3 py-2">
              {row.at.slice(0, 16).replace("T", " ")} · {row.person} · {row.role} · {row.action}
              {row.organization ? ` · ${row.organization}` : ""}
              {row.standard ? ` · ${row.standard}` : ""}
              {row.language ? ` · ${row.language}` : ""}
              {row.posting ? ` · ${row.posting}` : ""}
            </li>
          ))}
        </ul>
        <h3 className="mt-6 font-medium">Audit events for this person</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {props.audits.map((row) => (
            <li key={row.id}>{row.at.slice(0, 16).replace("T", " ")} · {row.person} · {row.action}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
