"use client";

import { useEffect } from "react";

/** Re-check Pesapal while the M-Pesa prompt is open, including after the phone app returns. */
export function PaymentWait({ wait }: { wait: number }) {
  useEffect(() => {
    if (wait >= 24) return;
    let left = false;
    function recheck() {
      if (left) return;
      left = true;
      const url = new URL(window.location.href);
      url.searchParams.set("wait", String(wait + 1));
      window.location.replace(url.toString());
    }
    const timer = window.setTimeout(recheck, 5000);
    function onVisible() {
      if (document.visibilityState === "visible") recheck();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) recheck();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      left = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [wait]);

  return <p className="mt-3 text-sm text-[var(--muted)]">Waiting for the M-Pesa confirmation. Approve the prompt on your phone.</p>;
}
