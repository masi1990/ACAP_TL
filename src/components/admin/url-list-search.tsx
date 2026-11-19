"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListToolbar } from "@/components/list-toolbar";
import { listHref } from "@/lib/list-page";

/** Debounced search box that writes `q` to the URL (resetting to page 1) and stays on the given tab hash. */
export function UrlListSearch({
  pathname,
  hash,
  param = "q",
  pageParam = "page",
  keep,
  initial,
  placeholder,
  from,
  to,
  total,
}: {
  pathname: string;
  /** Tab id to stay on after the URL changes (no leading #). */
  hash?: string;
  /** Query-string key for the search text (several lists on one page use different keys). */
  param?: string;
  /** Query-string key for this list's page number. */
  pageParam?: string;
  /** Other query-string values to carry over unchanged. */
  keep?: Record<string, string | undefined>;
  initial: string;
  placeholder?: string;
  from: number;
  to: number;
  total: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function go(next: string) {
    const href = listHref(pathname, 1, { ...keep, [param]: next.trim() }, pageParam);
    router.replace(hash ? `${href}#${hash}` : href, { scroll: false });
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
      placeholder={placeholder}
      from={from}
      to={to}
      total={total}
    />
  );
}
