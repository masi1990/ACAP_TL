"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListToolbar } from "@/components/list-toolbar";
import { listHref } from "@/lib/list-page";

/** Search box for the by-country list. Writes `q` to the URL (resetting to page 1) and keeps the other filters. */
export function InstitutionSearch({
  pathname,
  query,
  initial,
  from,
  to,
  total,
}: {
  pathname: string;
  /** Other active filters (region, country, rec, type) to preserve. */
  query: Record<string, string | undefined>;
  initial: string;
  from: number;
  to: number;
  total: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterKey = JSON.stringify(query);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function go(next: string) {
    const q = next.trim();
    const href = `${listHref(pathname, 1, { ...(JSON.parse(filterKey) as Record<string, string | undefined>), q })}#by-country`;
    router.replace(href, { scroll: false });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), 300);
  }

  function onClear() {
    if (timer.current) clearTimeout(timer.current);
    setValue("");
    go("");
  }

  return (
    <ListToolbar
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder="Search country, authority, or account email"
      from={from}
      to={to}
      total={total}
    />
  );
}
