"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { notifyCrud } from "@/components/ui/crud-notice";
import type { Permission } from "@/lib/rbac";

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  scope: string;
  permissionsJson: string;
  isSystem: boolean;
  _count: { assignments: number };
};

type AssignmentRow = {
  id: string;
  userId: string;
  roleCode: string;
  organizationId: string | null;
  grantedAt: string;
  user: { id: string; email: string; name: string };
  role: { code: string; name: string; scope: string };
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  rolesGlobal: string;
  memberships: Array<{
    role: string;
    organization: { id: string; name: string; type: string };
  }>;
};

function parsePerms(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export function RolesAdminClient({
  initialRoles,
  initialAssignments,
  users,
  allPermissions,
  canWrite,
  canAssign,
}: {
  initialRoles: RoleRow[];
  initialAssignments: AssignmentRow[];
  users: UserRow[];
  allPermissions: Permission[];
  canWrite: boolean;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [selectedCode, setSelectedCode] = useState<string | null>(roles[0]?.code ?? null);
  const selected = useMemo(
    () => roles.find((r) => r.code === selectedCode) || null,
    [roles, selectedCode],
  );
  const selectedPerms = useMemo(
    () => (selected ? new Set(parsePerms(selected.permissionsJson)) : new Set<string>()),
    [selected],
  );

  // Create custom role
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScope, setNewScope] = useState<"GLOBAL" | "ORG">("GLOBAL");
  const [newPerms, setNewPerms] = useState<Set<string>>(new Set());

  // Assign
  const [assignUserId, setAssignUserId] = useState(users[0]?.id || "");
  const [assignRoleCode, setAssignRoleCode] = useState(roles[0]?.code || "");
  const [assignOrgId, setAssignOrgId] = useState("");

  const assignUser = users.find((u) => u.id === assignUserId);
  const assignRole = roles.find((r) => r.code === assignRoleCode);
  const orgOptions = assignUser?.memberships.map((m) => m.organization) || [];

  function toggleNewPerm(p: string) {
    setNewPerms((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  async function createRole() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        name: newName,
        description: newDesc,
        scope: newScope,
        permissions: [...newPerms],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Create failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setMsg(`Created role ${data.role.code}`);
    notifyCrud("created", data.role.code);
    setNewCode("");
    setNewName("");
    setNewDesc("");
    setNewPerms(new Set());
    router.refresh();
    setRoles((r) => [
      ...r,
      { ...data.role, _count: { assignments: 0 } },
    ]);
    setSelectedCode(data.role.code);
  }

  async function saveSelectedPerms(next: Set<string>) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/roles/${encodeURIComponent(selected.code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: [...next] }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Update failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setRoles((list) =>
      list.map((r) =>
        r.code === selected.code ? { ...r, permissionsJson: data.role.permissionsJson } : r,
      ),
    );
    setMsg(`Updated permissions for ${selected.code}`);
    notifyCrud("updated", selected.code);
  }

  async function deleteRole(code: string) {
    if (!confirm(`Delete custom role ${code}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/roles/${encodeURIComponent(code)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Delete failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setRoles((list) => list.filter((r) => r.code !== code));
    setSelectedCode((c) => (c === code ? null : c));
    setMsg(`Deleted ${code}`);
    notifyCrud("deleted", code);
  }

  async function assignRoleFn() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/roles/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: assignUserId,
        roleCode: assignRoleCode,
        organizationId: assignRole?.scope === "ORG" ? assignOrgId || null : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Assign failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setMsg(`Assigned ${assignRoleCode}`);
    notifyCrud("created", assignRoleCode);
    router.refresh();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this role assignment?")) return;
    setBusy(true);
    const res = await fetch("/api/admin/roles/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const message = data.error || "Revoke failed";
      setError(message);
      notifyCrud("error", message);
      return;
    }
    setAssignments((a) => a.filter((x) => x.id !== id));
    setMsg("Assignment revoked");
    notifyCrud("deleted", "Assignment revoked");
    router.refresh();
  }

  const permGroups = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of allPermissions) {
      const g = p.split(":")[0];
      (groups[g] ||= []).push(p);
    }
    return groups;
  }, [allPermissions]);

  return (
    <div className="space-y-8">
      {(error || msg) && (
        <p className={`text-sm ${error ? "text-rose-700" : "text-emerald-800"}`}>{error || msg}</p>
      )}

      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="panel max-h-[28rem] overflow-y-auto p-2">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Role catalogue
          </p>
          <ul className="space-y-0.5">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCode(r.code)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--surface-2)] ${
                    selectedCode === r.code ? "bg-[var(--surface-2)] font-medium" : ""
                  }`}
                >
                  <span className="truncate font-mono text-xs">{r.code}</span>
                  <span className="flex items-center gap-1">
                    {r.isSystem && <Badge tone="ok">sys</Badge>}
                    <span className="text-[10px] text-[var(--muted)]">{r._count.assignments}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel space-y-4 p-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{selected.name}</h3>
                  <p className="font-mono text-xs text-[var(--muted)]">
                    {selected.code} · {selected.scope}
                    {selected.isSystem ? " · system" : " · custom"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{selected.description}</p>
                </div>
                {!selected.isSystem && canWrite && (
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => deleteRole(selected.code)}>
                    Delete role
                  </Button>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold">Permissions (least privilege)</h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Only grant what the role needs. Prefer read over write; avoid roles:write and
                  impersonate on day-to-day roles.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {Object.entries(permGroups).map(([group, perms]) => (
                    <div key={group} className="rounded-md border border-[var(--line)] p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {group}
                      </p>
                      <ul className="space-y-1">
                        {perms.map((p) => {
                          const on = selectedPerms.has(p);
                          return (
                            <li key={p}>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  disabled={!canWrite || busy}
                                  onChange={() => {
                                    const next = new Set(selectedPerms);
                                    if (on) next.delete(p);
                                    else next.add(p);
                                    void saveSelectedPerms(next);
                                  }}
                                />
                                <span className="font-mono text-xs">{p}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">Select a role to inspect permissions.</p>
          )}
        </div>
      </section>

      {canWrite && (
        <section className="panel space-y-4 p-4">
          <h3 className="text-sm font-semibold">Create custom role</h3>
          <p className="text-xs text-[var(--muted)]">
            Custom roles start empty of elevated privileges. Principle of least privilege: add only
            the permissions this job function requires.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="newCode">Code</Label>
              <Input
                id="newCode"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="CATALOGUE_VIEWER"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="newName">Display name</Label>
              <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="newDesc">Description</Label>
              <Input id="newDesc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="newScope">Scope</Label>
              <select
                id="newScope"
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as "GLOBAL" | "ORG")}
                className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="GLOBAL">GLOBAL</option>
                <option value="ORG">ORG</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {allPermissions.map((p) => (
              <label key={p} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newPerms.has(p)} onChange={() => toggleNewPerm(p)} />
                <span className="font-mono">{p}</span>
              </label>
            ))}
          </div>
          <Button type="button" disabled={busy || !newCode || !newName || newPerms.size === 0} onClick={createRole}>
            Create role
          </Button>
        </section>
      )}

      {canAssign && (
        <section className="panel space-y-4 p-4">
          <h3 className="text-sm font-semibold">Assign role to user</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1">
              <Label>User</Label>
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label>Role</Label>
              <select
                value={assignRoleCode}
                onChange={(e) => setAssignRoleCode(e.target.value)}
                className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
              >
                {roles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code} ({r.scope})
                  </option>
                ))}
              </select>
            </div>
            {assignRole?.scope === "ORG" && (
              <div className="grid gap-1">
                <Label>Organisation</Label>
                <select
                  value={assignOrgId}
                  onChange={(e) => setAssignOrgId(e.target.value)}
                  className="h-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option value="">Select org…</option>
                  {orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <Button
            type="button"
            disabled={busy || !assignUserId || !assignRoleCode}
            onClick={assignRoleFn}
          >
            Assign
          </Button>
        </section>
      )}

      <section className="panel overflow-x-auto">
        <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold">
          Current assignments
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--muted)]">
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Org</th>
              <th className="px-4 py-2">Granted</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--muted)]">
                  No role assignments yet.
                </td>
              </tr>
            )}
            {assignments.map((a) => (
              <tr key={a.id} className="border-b border-[var(--line)]/50">
                <td className="px-4 py-2">
                  <div>{a.user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{a.user.email}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{a.roleCode}</td>
                <td className="px-4 py-2 text-xs text-[var(--muted)]">{a.organizationId || "—"}</td>
                <td className="px-4 py-2 text-xs">{new Date(a.grantedAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  {canAssign && (
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => revoke(a.id)}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto">
        <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold">
          Users &amp; memberships
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--muted)]">
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Legacy global roles</th>
              <th className="px-4 py-2">Org memberships</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)]/50 align-top">
                <td className="px-4 py-2">
                  <div>{u.name}</div>
                  <div className="text-xs text-[var(--muted)]">{u.email}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{u.rolesGlobal || "—"}</td>
                <td className="px-4 py-2 text-xs">
                  {u.memberships.length === 0
                    ? "—"
                    : u.memberships.map((m) => (
                        <div key={m.organization.id}>
                          {m.organization.name} ({m.organization.type}) · {m.role}
                        </div>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
