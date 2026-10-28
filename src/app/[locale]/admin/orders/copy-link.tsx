"use client";

import { useState } from "react";

export function CopyLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={href} className="text-[var(--accent)] underline" target="_blank" rel="noreferrer">
        Download link
      </a>
      <button type="button" onClick={copy} className="text-xs text-[var(--accent)] underline">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
