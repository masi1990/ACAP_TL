"use client";

import { cn } from "@/lib/utils";

export function ListToolbar({
  value,
  onChange,
  onClear,
  placeholder = "Search",
  from,
  to,
  total,
  className,
}: {
  value: string;
  onChange: (q: string) => void;
  onClear: () => void;
  placeholder?: string;
  from?: number;
  to?: number;
  total?: number;
  className?: string;
}) {
  const hasQuery = value.trim().length > 0;
  const count =
    typeof total === "number"
      ? typeof from === "number" && typeof to === "number" && total > 0
        ? `Showing ${from}–${to} of ${total}`
        : `${total} match${total === 1 ? "" : "es"}`
      : null;

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
        <span className="text-[var(--muted)]">Search</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <button
        type="button"
        disabled={!hasQuery}
        onClick={onClear}
        className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm disabled:opacity-40"
      >
        Clear
      </button>
      {count ? <p className="pb-2 text-sm text-[var(--muted)]">{count}</p> : null}
    </div>
  );
}
