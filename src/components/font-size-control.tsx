"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = [
  { id: "small", label: "Small" },
  { id: "smaller", label: "Smaller" },
  { id: "smallest", label: "Smallest" },
] as const;

type FontSize = (typeof SIZES)[number]["id"];

const STORAGE_KEY = "acap-font-size";

function isFontSize(value: string | null): value is FontSize {
  return value === "small" || value === "smaller" || value === "smallest";
}

function applyFontSize(size: FontSize) {
  document.documentElement.dataset.fontSize = size;
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    /* private browsing can block storage; the choice still applies for this view */
  }
}

export function FontSizeControl() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<FontSize>("small");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.fontSize || null;
    if (isFontSize(current)) setSize(current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: FontSize) {
    setSize(next);
    applyFontSize(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Font size"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--ink)] bg-white text-[var(--ink)]"
      >
        <span aria-hidden className="font-semibold leading-none">
          <span className="text-lg">A</span>
          <span className="text-xs">a</span>
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Font size"
          className="absolute end-0 top-full z-50 mt-2 w-44 rounded-md border border-[var(--line)] bg-white p-1 shadow-lg"
        >
          {SIZES.map((option) => {
            const selected = option.id === size;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(option.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[var(--ink)]",
                  selected ? "bg-[var(--ink)] text-white" : "hover:bg-[var(--surface-2)]",
                )}
              >
                <span className={option.id === "smallest" ? "text-sm" : option.id === "smaller" ? "text-base" : "text-lg"}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
