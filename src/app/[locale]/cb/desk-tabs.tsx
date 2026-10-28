"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DeskTabs({
  tabs,
  activeId,
  onSelect,
  syncHash = true,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  /** When set, the parent owns which tab is open. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Nested tabs leave the page hash to the outer tab list. */
  syncHash?: boolean;
}) {
  const [internal, setInternal] = useState(tabs[0]?.id || "");
  const active = activeId ?? internal;

  useEffect(() => {
    if (!syncHash || activeId != null) return;
    const hash = window.location.hash.replace("#", "");
    if (tabs.some((tab) => tab.id === hash)) setInternal(hash);
  }, [tabs, activeId, syncHash]);

  function select(id: string) {
    if (activeId == null) setInternal(id);
    onSelect?.(id);
    if (syncHash) window.history.replaceState(null, "", `#${id}`);
  }

  const current = tabs.find((tab) => tab.id === active) || tabs[0];

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--line)]" role="tablist">
        {tabs.map((tab) => {
          const selected = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => select(tab.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm",
                selected
                  ? "border-[var(--accent)] font-medium text-[var(--ink)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="pt-6" role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}
