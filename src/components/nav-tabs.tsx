"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Admin section tabs. The overview matches only its own URL; a longer path wins over its parent. */
export function NavTabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname() || "";
  const overview = items[0]?.href;
  let active = "";
  let best = -1;
  for (const item of items) {
    const hit =
      item.href === overview
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (hit && item.href.length > best) {
      best = item.href.length;
      active = item.href;
    }
  }

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
      {items.map((item) => {
        const selected = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              selected
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
