"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DeskTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id || "");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (tabs.some((tab) => tab.id === hash)) setActive(hash);
  }, [tabs]);

  function select(id: string) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
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
