"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyCrud } from "@/components/ui/crud-notice";

export function SurveillanceClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function fileComplaint() {
    const res = await fetch("/api/surveillance/complaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinCode: pin, subject, body, complainantEmail: email }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message = data.error || "Complaint failed";
      setMsg(message);
      notifyCrud("error", message);
      return;
    }
    setPin("");
    setSubject("");
    setBody("");
    setEmail("");
    setMsg("Created");
    notifyCrud("created", "Complaint filed");
    router.refresh();
  }

  async function openCase() {
    const res = await fetch("/api/surveillance/case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinCode: pin, title: subject || "Market surveillance case", summary: body, cascade: false }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message = data.error || "Case failed";
      setMsg(message);
      notifyCrud("error", message);
      return;
    }
    setPin("");
    setSubject("");
    setBody("");
    setEmail("");
    setMsg("Created");
    notifyCrud("created", "Surveillance case opened");
    router.refresh();
  }

  return (
    <div className="panel mt-8 max-w-2xl space-y-3 p-5">
      <h2 className="font-semibold">File complaint / open case ({locale})</h2>
      <div className="grid gap-2">
        <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN code (optional)" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" />
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={fileComplaint}>Submit CB-routed complaint</Button>
        <Button variant="secondary" onClick={() => openCase()}>
          Open surveillance case
        </Button>
      </div>
      {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}
    </div>
  );
}
