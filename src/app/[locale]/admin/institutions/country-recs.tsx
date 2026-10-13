"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CountryRecForm({
  memberStateId,
  recs,
  selected,
}: {
  memberStateId: string;
  recs: { id: string; code: string; name: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState(selected);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/member-states/${memberStateId}/recs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recIds: ids }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save REC membership");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-sm">
        {recs.map((rec) => (
          <label key={rec.id} className="flex items-center gap-2">
            <input type="checkbox" checked={ids.includes(rec.id)} onChange={() => toggle(rec.id)} />
            <span>
              {rec.code}
              <span className="text-[var(--muted)]"> · {rec.name}</span>
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="h-9 rounded-md border border-[var(--line)] px-3 text-sm"
      >
        Save REC membership
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
