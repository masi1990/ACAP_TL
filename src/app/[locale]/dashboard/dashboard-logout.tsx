"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DashboardLogout({ locale }: { locale: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" disabled={busy} onClick={logout}>
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
