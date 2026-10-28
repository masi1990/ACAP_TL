"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-left text-sm"
      >
        <span className={cn("truncate", !selected && "text-[var(--muted)]")}>{selected?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)] shadow-lg">
          <div className="flex items-center gap-2 border-b border-[var(--line)] p-2">
            <Input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const first = filtered[0];
                if (first) choose(first.value);
              }}
            />
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
              onClick={() => searchRef.current?.focus()}
            >
              <Search className="h-4 w-4" aria-hidden />
              Search
            </button>
          </div>
          <ul id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-sm text-[var(--muted)]">No matches</li>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => choose(option.value)}
                      className={cn(
                        "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]",
                        active && "bg-[var(--surface-2)] font-medium",
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
