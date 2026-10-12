"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Client-side redirect — avoids aborting Server Layout performance.measure (Next 16 / Turbopack). */
export function ClientRedirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[var(--muted)]">
      Redirecting…
    </div>
  );
}
