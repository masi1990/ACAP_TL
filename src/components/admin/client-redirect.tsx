"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/base-path";

/** Client-side redirect — avoids aborting Server Layout performance.measure (Next 16 / Turbopack). */
export function ClientRedirect({ href }: { href: string }) {
  const router = useRouter();
  const target = withBasePath(href);
  useEffect(() => {
    // Prefer hard navigation so /arso basePath is never stripped by the router.
    if (typeof window !== "undefined") {
      window.location.replace(target);
      return;
    }
    router.replace(target);
  }, [target, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[var(--muted)]">
      Redirecting…
    </div>
  );
}
