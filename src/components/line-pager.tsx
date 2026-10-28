"use client";

import Link from "next/link";

const linkClass = "inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm";
const idleClass = "inline-flex h-10 items-center px-4 text-sm text-[var(--muted)]";

export function LinePager({
  page,
  pageCount,
  prevHref,
  nextHref,
  onPage,
}: {
  page: number;
  pageCount: number;
  prevHref?: string;
  nextHref?: string;
  onPage?: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  function control(label: string, enabled: boolean, href: string | undefined, target: number) {
    if (!enabled) return <span className={idleClass}>{label}</span>;
    if (href) {
      return (
        <Link href={href} className={linkClass}>
          {label}
        </Link>
      );
    }
    return (
      <button type="button" className={linkClass} onClick={() => onPage?.(target)}>
        {label}
      </button>
    );
  }

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pages">
      {control("Prev", page > 1, prevHref, page - 1)}
      <p className="text-sm text-[var(--muted)]">{`Page ${page} of ${pageCount}`}</p>
      {control("Next", page < pageCount, nextHref, page + 1)}
    </nav>
  );
}
