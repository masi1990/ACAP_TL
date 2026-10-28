"use client";

import { useState } from "react";
import { extractClause1ScopeOnly } from "@/lib/scope-text";

const PREVIEW_CHARS = 180;

/** Fixed-length scope preview. Longer clauses open with View more or Show scope. */
export function ScopeReveal({
  text,
  empty = "Scope text not yet available for this standard.",
  mode = "preview",
}: {
  text: string;
  empty?: string;
  /** preview keeps three lines visible. hidden stays closed until Show scope. */
  mode?: "preview" | "hidden";
}) {
  const [open, setOpen] = useState(false);
  const body = extractClause1ScopeOnly(text).trim();
  if (!body) {
    return <p className="text-sm leading-relaxed text-[var(--muted)]">{empty}</p>;
  }

  const long = body.length > PREVIEW_CHARS;
  if (mode === "hidden") {
    return (
      <div>
        {open ? <p className="text-sm leading-relaxed text-[var(--muted)]">{body}</p> : null}
        <button
          type="button"
          className={`${open ? "mt-1 " : ""}text-sm font-semibold text-[var(--accent)] underline`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide scope" : "Show scope"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className={open ? "text-sm leading-relaxed text-[var(--muted)]" : "line-clamp-3 text-sm leading-relaxed text-[var(--muted)]"}>
        {body}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-1 text-sm font-semibold text-[var(--accent)] underline"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide scope" : "View more"}
        </button>
      ) : null}
    </div>
  );
}
