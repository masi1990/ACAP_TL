import type { DeskActor } from "@/lib/customs-desk";

export function ActorNote({ actor }: { actor: DeskActor | null | undefined }) {
  if (!actor?.name) return <>—</>;
  return (
    <div>
      <div className="font-medium">{actor.name}</div>
      <div className="text-xs text-[var(--muted)]">
        {actor.email}
        {actor.organization ? ` · ${actor.organization}` : ""}
      </div>
    </div>
  );
}
