"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabel } from "@/lib/rbac";

export type AccountRole = {
  code: string;
  name: string;
  scope: "GLOBAL" | "ORG";
};

type Member = {
  userId: string;
  email: string;
  name: string;
  role: string;
  hubRoles: { code: string; name: string }[];
};

function labelFor(roles: AccountRole[], code: string) {
  return roles.find((role) => role.code === code)?.name || roleLabel(code);
}

export function InstitutionAccounts({
  organizationId,
  members,
  roles,
  canAssign,
}: {
  organizationId: string;
  members: Member[];
  roles: AccountRole[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const orgRoles = roles.filter((role) => role.scope !== "GLOBAL");
  const hubRoles = roles.filter((role) => role.scope === "GLOBAL");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(orgRoles.find((item) => item.code === "ORG_VIEWER")?.code || orgRoles[0]?.code || roles[0]?.code || "ORG_USER");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function assignExisting() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/org/assign-existing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, organizationId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not assign that account");
      return;
    }
    setEmail("");
    setMessage(data.message || "Role assigned");
    router.refresh();
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/org/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, organizationId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setEmail("");
    setMessage(data.message || "Invitation sent");
    router.refresh();
  }

  async function changeRole(userId: string, roleCode: string, scope: "GLOBAL" | "ORG") {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/roles/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        scope === "GLOBAL" ? { userId, roleCode } : { userId, roleCode, organizationId },
      ),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not change the role");
      return;
    }
    setMessage(scope === "GLOBAL" ? "Hub role added" : "Role updated");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3 text-sm">
        {members.length === 0 && <li className="text-[var(--muted)]">No account holders yet.</li>}
        {members.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center gap-2">
            <span className="min-w-48">
              <span className="font-medium">{member.name || member.email}</span>
              <span className="block text-xs text-[var(--muted)]">{member.email}</span>
            </span>
            {canAssign ? (
              <RoleSelect
                roles={
                  member.role && !orgRoles.some((item) => item.code === member.role)
                    ? [{ code: member.role, name: roleLabel(member.role), scope: "ORG" }, ...orgRoles]
                    : orgRoles
                }
                value={member.role}
                disabled={busy}
                onSave={(roleCode) => changeRole(member.userId, roleCode, "ORG")}
              />
            ) : (
              <span>{labelFor(roles, member.role)}</span>
            )}
            {member.hubRoles.map((hub) => (
              <span
                key={hub.code}
                className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-xs"
              >
                {hub.name}
              </span>
            ))}
            {canAssign && hubRoles.length > 0 && (
              <HubRoleGrant
                roles={hubRoles.filter((hub) => !member.hubRoles.some((held) => held.code === hub.code))}
                disabled={busy}
                onSave={(roleCode) => changeRole(member.userId, roleCode, "GLOBAL")}
              />
            )}
          </li>
        ))}
      </ul>
      {canAssign && roles.length > 0 && (
        <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3"
            >
              {orgRoles.length > 0 && (
                <optgroup label="Organisation roles">
                  {orgRoles.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {hubRoles.length > 0 && (
                <optgroup label="Hub roles">
                  {hubRoles.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-[var(--accent-fg)]"
          >
            Invite
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={assignExisting}
            className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          >
            Assign existing account
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}

function RoleSelect({
  roles,
  value,
  disabled,
  onSave,
}: {
  roles: AccountRole[];
  value: string;
  disabled: boolean;
  onSave: (role: string) => void;
}) {
  const [role, setRole] = useState(value);
  return (
    <>
      <select
        value={roles.some((item) => item.code === role) ? role : value}
        onChange={(event) => setRole(event.target.value)}
        className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
      >
        {roles.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled || role === value}
        onClick={() => onSave(role)}
        className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
      >
        Save role
      </button>
    </>
  );
}

function HubRoleGrant({
  roles,
  disabled,
  onSave,
}: {
  roles: AccountRole[];
  disabled: boolean;
  onSave: (role: string) => void;
}) {
  const [role, setRole] = useState(roles[0]?.code || "");
  if (roles.length === 0) return null;
  return (
    <>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
        aria-label="Hub role"
        className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
      >
        {roles.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled || !role}
        onClick={() => onSave(role)}
        className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
      >
        Add hub role
      </button>
    </>
  );
}
