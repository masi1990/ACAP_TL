"use client";

import { useEffect, useState } from "react";

type Option = { id: string; name: string; countries: { id: string; name: string }[] };
type StandardOption = { id: string; designation: string; titleEn: string; committee: string };

export function StandardRequestForm({
  signedInEmail,
  signedInName,
}: {
  locale: string;
  signedInEmail?: string;
  signedInName?: string;
}) {
  const [institutions, setInstitutions] = useState<Option[]>([]);
  const [standardCount, setStandardCount] = useState(0);
  const [orgId, setOrgId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StandardOption[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StandardOption[]>([]);
  const [numbers, setNumbers] = useState("");
  const [showNumbers, setShowNumbers] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/library/options")
      .then((res) => res.json())
      .then((data) => {
        setInstitutions(data.institutions || []);
        setStandardCount(data.standardCount || 0);
      })
      .catch(() => setError("Could not load institutions"));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setMatchCount(0);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/library/options?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.standards || []);
          setMatchCount(data.matchCount || 0);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Could not search standards");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const org = institutions.find((item) => item.id === orgId);
  const selectedIds = new Set(selected.map((item) => item.id));

  function addStandards(items: StandardOption[]) {
    setSelected((current) => {
      const seen = new Set(current.map((item) => item.id));
      const next = [...current];
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          next.push(item);
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
    if (!selected.length) {
      setError("Add at least one standard");
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
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Could not send the request");
    else {
      setSelected([]);
      setQuery("");
      setMessage("Request sent. ARSO will email a link if the standards are released.");
    }
  }

  const shownAll = matchCount > 0 && matchCount === results.length;

  return (
    <form onSubmit={onSubmit} className="mt-10 grid max-w-2xl gap-3 rounded-xl border border-[var(--line)] p-4">
      <h2 className="text-lg font-semibold">Request particular standards</h2>
      <p className="text-sm text-[var(--muted)]">
        Search the {standardCount.toLocaleString()} published standards by number or name, then add the ones you need.
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

      <div className="grid gap-2 rounded-lg border border-[var(--line)] p-3">
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
          {query.trim().length < 2
            ? "Type at least two characters."
            : searching
              ? "Searching…"
              : matchCount === 0
                ? "No published standards match."
                : `Showing ${results.length} of ${matchCount.toLocaleString()} matches.`}
        </p>
        {results.length ? (
          <>
            {shownAll ? (
              <button type="button" className="w-fit text-sm underline" onClick={() => addStandards(results)}>
                Add all matches
              </button>
            ) : null}
            <ul className="max-h-72 divide-y divide-[var(--line)] overflow-auto rounded-md border border-[var(--line)]">
              {results.map((standard) => {
                const added = selectedIds.has(standard.id);
                return (
                  <li key={standard.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      <span className="font-mono">{standard.designation}</span>
                      {standard.committee ? <span className="text-[var(--muted)]"> · {standard.committee}</span> : null}
                      <span className="mt-0.5 block text-[var(--muted)]">{standard.titleEn}</span>
                    </span>
                    <button
                      type="button"
                      disabled={added}
                      className="shrink-0 rounded-md border border-[var(--line)] px-2 py-1 text-xs disabled:opacity-50"
                      onClick={() => addStandards([standard])}
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

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

      <label className="grid gap-1 text-sm">Note<textarea name="note" className="rounded-md border border-[var(--line)] px-3 py-2" /></label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      <button className="w-fit rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-white">Send request</button>
    </form>
  );
}
