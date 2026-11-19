"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { LibraryCatalogue } from "./library-catalogue";
import type { LibraryFacet, LibraryStandardRow } from "./library-types";

type Option = { id: string; name: string; countries: { id: string; name: string }[] };
type StandardOption = { id: string; designation: string; titleEn: string };
type OtherItem = { id: string; designation: string; title: string };

export function StandardRequestForm({
  locale,
  signedInEmail,
  signedInName,
}: {
  locale: Locale;
  signedInEmail?: string;
  signedInName?: string;
}) {
  const [institutions, setInstitutions] = useState<Option[]>([]);
  const [standardCount, setStandardCount] = useState(0);
  const [facets, setFacets] = useState<LibraryFacet | null>(null);
  const [sectorId, setSectorId] = useState("");
  const [committeeId, setCommitteeId] = useState("");
  const [kind, setKind] = useState("");
  const [orgId, setOrgId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryStandardRow[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StandardOption[]>([]);
  const [otherItems, setOtherItems] = useState<OtherItem[]>([]);
  const [numbers, setNumbers] = useState("");
  const [showNumbers, setShowNumbers] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ browse: "1", lang: locale });
    const q = query.trim();
    if (q.length >= 2) params.set("q", q);
    if (sectorId) params.set("sector", sectorId);
    if (committeeId) params.set("committee", committeeId);
    if (kind) params.set("kind", kind);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/library/options?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setInstitutions(data.institutions || []);
          setStandardCount(data.standardCount || 0);
          if (data.facets) setFacets(data.facets);
          setResults(data.standards || []);
          setMatchCount(data.matchCount || 0);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Could not load standards");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, q.length >= 2 ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, sectorId, committeeId, kind, locale]);

  const org = institutions.find((item) => item.id === orgId);
  const selectedIds = new Set(selected.map((item) => item.id));

  function addStandards(items: Array<{ id: string; designation: string; titleEn?: string; title?: string }>) {
    setSelected((current) => {
      const seen = new Set(current.map((item) => item.id));
      const next = [...current];
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          next.push({ id: item.id, designation: item.designation, titleEn: item.titleEn || item.title || "" });
        }
      }
      return next;
    });
  }

  async function addNumbers() {
    const list = numbers.trim();
    if (!list) return;
    setError("");
    const res = await fetch(`/api/library/options?numbers=${encodeURIComponent(list)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("Could not look up those numbers");
      return;
    }
    addStandards(data.numbered || []);
    const missing = (data.missing || []) as string[];
    if (missing.length) setError(`Not found: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`);
    else setNumbers("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const otherToSend = otherItems
      .map((row) => ({ designation: row.designation.trim(), title: row.title.trim() }))
      .filter((row) => row.designation);
    if (!selected.length && !otherToSend.length) {
      setError("Add at least one standard, or list one under Other / not listed.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/library/standard-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        organizationId: form.get("organizationId"),
        memberStateId: form.get("memberStateId"),
        note: form.get("note"),
        standardIds: selected.map((item) => item.id),
        otherItems: otherToSend,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Could not send the request");
    else {
      setSelected([]);
      setOtherItems([]);
      setQuery("");
      setMessage("Request sent. ARSO will email a link if the standards are released.");
    }
  }

  const shownAll = matchCount > 0 && matchCount === results.length;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid max-w-2xl gap-3">
      <p className="text-sm text-[var(--muted)]">
        Browse the {standardCount.toLocaleString()} published standards by sector, technical committee, and category, or search by number or name.
        ARSO emails one link. The link does not download the file.
      </p>
      <label className="grid gap-1 text-sm">Name<input name="name" required defaultValue={signedInName || ""} className="rounded-md border border-[var(--line)] px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Email<input name="email" type="email" required defaultValue={signedInEmail || ""} className="rounded-md border border-[var(--line)] px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">
        Institution
        <select name="organizationId" required value={orgId} onChange={(event) => setOrgId(event.target.value)} className="rounded-md border border-[var(--line)] px-3 py-2">
          <option value="">Choose</option>
          {institutions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Country
        <select name="memberStateId" required className="rounded-md border border-[var(--line)] px-3 py-2">
          <option value="">Choose</option>
          {(org?.countries || []).map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
      </label>
      </div>

      <div className="grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Selected ({selected.length})</h3>
          {selected.length ? (
            <button type="button" className="text-xs underline" onClick={() => setSelected([])}>Clear</button>
          ) : null}
        </div>
        {selected.length ? (
          <ul className="flex flex-wrap gap-2">
            {selected.map((standard) => (
              <li key={standard.id}>
                <button
                  type="button"
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-left text-xs"
                  onClick={() => setSelected((current) => current.filter((item) => item.id !== standard.id))}
                >
                  <span className="font-mono">{standard.designation}</span>
                  <span className="text-[var(--muted)]"> · remove</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">None yet. Search below and add each standard you want.</p>
        )}

        <label className="grid gap-1 text-sm">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Number, name, or committee — ARS 466, maize, TC 12"
            className="rounded-md border border-[var(--line)] px-3 py-2"
          />
        </label>
        <p className="text-xs text-[var(--muted)]">
          {searching
            ? "Loading standards…"
            : matchCount === 0
              ? "No published standards match."
              : results.length < matchCount
                ? `Showing the first ${results.length.toLocaleString()} of ${matchCount.toLocaleString()}. Search to narrow the list.`
                : `Showing ${results.length.toLocaleString()} standard${results.length === 1 ? "" : "s"}.`}
        </p>
        {shownAll && results.length > 1 ? (
          <button type="button" className="w-fit text-sm underline" onClick={() => addStandards(results)}>
            Add all shown
          </button>
        ) : null}
        <LibraryCatalogue
          mode="add"
          locale={locale}
          rows={results}
          facets={facets || undefined}
          filter={{ sectorId, committeeId, kind }}
          onFilter={(next) => {
            setSectorId(next.sectorId);
            setCommitteeId(next.committeeId);
            setKind(next.kind);
          }}
          emptyLabel={searching ? "Loading standards…" : "No published standards match these tabs."}
          action={(standard) => {
            const added = selectedIds.has(standard.id);
            return (
              <button
                type="button"
                disabled={added}
                className="rounded-md border border-[var(--line)] px-2 py-1 text-xs disabled:opacity-50"
                onClick={() => addStandards([standard])}
              >
                {added ? "Added" : "Add"}
              </button>
            );
          }}
        />

        <section className="grid gap-2 rounded-lg border border-dashed border-[var(--line)] p-3">
          <h3 className="text-sm font-semibold">Other / not listed</h3>
          <p className="text-xs text-[var(--muted)]">
            Use this when the standard is missing from the catalogue or you only know the number.
          </p>
          {otherItems.map((row) => (
            <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
              <label className="grid gap-1 text-xs">
                Designation (required)
                <input
                  value={row.designation}
                  onChange={(event) =>
                    setOtherItems((rows) => rows.map((r) => (r.id === row.id ? { ...r, designation: event.target.value } : r)))
                  }
                  placeholder="ARS 1234"
                  className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs">
                Title (optional)
                <input
                  value={row.title}
                  onChange={(event) =>
                    setOtherItems((rows) => rows.map((r) => (r.id === row.id ? { ...r, title: event.target.value } : r)))
                  }
                  className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                className="w-fit rounded-md border border-[var(--line)] px-3 py-2 text-xs"
                onClick={() => setOtherItems((rows) => rows.filter((r) => r.id !== row.id))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="w-fit rounded-md border border-[var(--line)] px-3 py-1.5 text-sm"
            onClick={() => setOtherItems((rows) => [...rows, { id: crypto.randomUUID(), designation: "", title: "" }])}
          >
            {otherItems.length ? "Add another" : "Add a standard not listed"}
          </button>
        </section>

        <button type="button" className="w-fit text-sm underline" onClick={() => setShowNumbers((open) => !open)}>
          {showNumbers ? "Hide number list" : "Paste standard numbers"}
        </button>
        {showNumbers ? (
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm">
              Standard numbers
              <textarea
                value={numbers}
                onChange={(event) => setNumbers(event.target.value)}
                rows={4}
                placeholder={"ARS 466\nARS 838"}
                className="rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm"
              />
            </label>
            <button type="button" className="w-fit rounded-md border border-[var(--line)] px-3 py-1.5 text-sm" onClick={addNumbers}>
              Add these numbers
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid max-w-2xl gap-3">
      <label className="grid gap-1 text-sm">Note<textarea name="note" className="rounded-md border border-[var(--line)] px-3 py-2" /></label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      <button className="w-fit rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">Send request</button>
      </div>
    </form>
  );
}
