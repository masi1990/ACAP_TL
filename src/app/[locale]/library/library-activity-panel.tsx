"use client";

import { useMemo, useState } from "react";
import type { LibraryActivityItem } from "./library-page-shell";

const PAGE = 10;

export function LibraryActivityPanel({ activity }: { activity: LibraryActivityItem[] }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return activity;
    return activity.filter((row) =>
      [row.at, row.action, row.roleCode, row.designation, row.language, row.posting]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [activity, query]);

  const shown = filtered.slice(0, visible);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your activity</h2>
          <p className="text-sm text-[var(--muted)]">
            {filtered.length} event{filtered.length === 1 ? "" : "s"}
            {query.trim() ? " matching your filter" : ""}.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          Filter
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE);
            }}
            placeholder="Action, standard, role…"
            className="rounded-md border border-[var(--line)] px-3 py-2"
          />
        </label>
      </div>
      <ul className="space-y-2 text-sm">
        {shown.map((row) => (
          <li key={row.id} className="rounded-md border border-[var(--line)] px-3 py-2">
            {row.at} · {row.action}
            {row.roleCode ? ` · ${row.roleCode}` : ""}
            {row.designation ? ` · ${row.designation}` : ""}
            {row.language ? ` · ${row.language}` : ""}
            {row.posting ? ` · ${row.posting}` : ""}
          </li>
        ))}
        {filtered.length === 0 ? <li className="text-[var(--muted)]">No library activity yet.</li> : null}
      </ul>
      {visible < filtered.length ? (
        <button
          type="button"
          className="w-fit rounded-md border border-[var(--line)] px-3 py-1.5 text-sm"
          onClick={() => setVisible((count) => count + PAGE)}
        >
          Show more ({filtered.length - visible} remaining)
        </button>
      ) : null}
    </section>
  );
}
