"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListToolbar } from "@/components/list-toolbar";
import { listHref } from "@/lib/list-page";

/** Debounced search box that writes `q` to the URL (resetting to page 1) and stays on the given tab hash. */
export function UrlListSearch({
  pathname,
  hash,
  initial,
  placeholder,
  from,
  to,
  total,
}: {
  pathname: string;
  /** Tab id to stay on after the URL changes (no leading #). */
  hash: string;
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
    router.replace(`${listHref(pathname, 1, { q: next.trim() })}#${hash}`, { scroll: false });
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
