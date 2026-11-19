"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DeskTabs({
  tabs,
  activeId,
  onSelect,
  syncHash = true,
  keepMounted = false,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
  /** When set, the parent owns which tab is open. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Nested tabs leave the page hash to the outer tab list. */
  syncHash?: boolean;
  /** Render every panel and hide inactive ones, so tab state (e.g. forms) survives switching. */
  keepMounted?: boolean;
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
      <div
        className="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] px-1 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]"
        role="tablist"
      >
        {tabs.map((tab) => {
          const selected = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                select(tab.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
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
      {keepMounted ? (
        tabs.map((tab) => {
          const selected = tab.id === current?.id;
          return (
            <div key={tab.id} className="pt-6" role="tabpanel" hidden={!selected} aria-hidden={!selected}>
              {tab.content}
            </div>
          );
        })
      ) : (
        <div className="pt-6" role="tabpanel">
          {current?.content}
        </div>
      )}
    </div>
  );
}
