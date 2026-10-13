"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptInviteForm({
  token,
  locale,
  email,
  needsAccount,
}: {
  token: string;
  locale: string;
  email: string;
  needsAccount: boolean;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not accept the invitation");
      return;
    }
    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <form onSubmit={accept} className="panel mt-6 space-y-4 p-5">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly />
      </div>
      {needsAccount && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Accepting…" : "Accept invitation"}
      </Button>
    </form>
  );
}
