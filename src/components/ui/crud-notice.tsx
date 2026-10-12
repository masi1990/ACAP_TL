"use client";

import { useEffect, useState } from "react";

export type CrudKind = "created" | "updated" | "deleted" | "error";

type Notice = { id: number; kind: CrudKind; text: string };

const LABEL: Record<Exclude<CrudKind, "error">, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
};

const STORAGE_KEY = "acap-crud-notice";

function remember(notice: Notice) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notice));
  } catch {
    /* private mode */
  }
}

function recall(): Notice | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const notice = JSON.parse(raw) as Notice;
    if (Date.now() - notice.id > 4000) return null;
    return notice;
  } catch {
    return null;
  }
}

export function notifyCrud(kind: CrudKind, detail?: string) {
  if (typeof window === "undefined") return;
  const text = kind === "error" ? detail || "The action failed" : detail ? `${LABEL[kind]}. ${detail}` : `${LABEL[kind]}.`;
  const notice: Notice = { id: Date.now(), kind, text };
  remember(notice);
  window.dispatchEvent(new CustomEvent<Notice>("acap-crud", { detail: notice }));
}

export function CrudNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const stored = recall();
    if (stored) setNotice(stored);
    function onNotice(event: Event) {
      setNotice((event as CustomEvent<Notice>).detail);
    }
    window.addEventListener("acap-crud", onNotice);
    return () => window.removeEventListener("acap-crud", onNotice);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* private mode */
      }
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  const ok = notice.kind !== "error";
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] max-w-sm" role="status" aria-live="polite">
      <div
        className={
          ok
            ? "pointer-events-auto rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-lg"
            : "pointer-events-auto rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 shadow-lg"
        }
      >
        {notice.text}
      </div>
    </div>
  );
}
