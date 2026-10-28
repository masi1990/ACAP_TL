import { prisma } from "@/lib/db";
import type { DeskActor } from "@/lib/customs-desk";

type Person = {
  name: string;
  email: string;
  memberships: { organizationId: string; name: string }[];
};

async function loadPeople(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, Person>();
  if (!unique.length) return map;
  const users = await prisma.userAccount.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: { select: { organizationId: true, organization: { select: { name: true } } } },
    },
  });
  for (const user of users) {
    map.set(user.id, {
      name: user.name,
      email: user.email,
      memberships: user.memberships.map((membership) => ({
        organizationId: membership.organizationId,
        name: membership.organization.name,
      })),
    });
  }
  return map;
}

function personActor(person: Person | undefined, organizationId?: string | null): DeskActor | null {
  if (!person) return null;
  const named =
    person.memberships.find((membership) => membership.organizationId === organizationId)?.name ||
    person.memberships[0]?.name ||
    "";
  return { name: person.name, email: person.email, organization: named };
}

/** Latest person who created or updated each record, from the audit log. */
export async function latestActors(entityType: string, entityIds: string[]) {
  const map = new Map<string, DeskActor>();
  if (!entityIds.length) return map;
  const events = await prisma.auditEvent.findMany({
    where: { entityType, entityId: { in: entityIds }, actorUserId: { not: null } },
    orderBy: { occurredAt: "desc" },
    select: { entityId: true, actorUserId: true, organizationId: true },
  });
  const first = new Map<string, { userId: string; organizationId: string | null }>();
  for (const event of events) {
    if (first.has(event.entityId) || !event.actorUserId) continue;
    first.set(event.entityId, { userId: event.actorUserId, organizationId: event.organizationId });
  }
  const people = await loadPeople([...first.values()].map((hit) => hit.userId));
  for (const [entityId, hit] of first) {
    const actor = personActor(people.get(hit.userId), hit.organizationId);
    if (actor) map.set(entityId, actor);
  }
  return map;
}

type DecisionProduct = {
  inspections: Array<{ inspectorUserId: string | null; organizationId: string | null }>;
  clearances: Array<{ officerUserId: string | null; organizationId: string | null }>;
};

/** Attach the inspector and customs officer to the latest decision on each product. */
export async function withDecisionActors<T extends DecisionProduct>(products: T[]) {
  const userIds: string[] = [];
  for (const product of products) {
    for (const row of product.inspections) if (row.inspectorUserId) userIds.push(row.inspectorUserId);
    for (const row of product.clearances) if (row.officerUserId) userIds.push(row.officerUserId);
  }
  const people = await loadPeople(userIds);
  return products.map((product) => ({
    ...product,
    inspections: product.inspections.map((row) => ({
      ...row,
      actor: personActor(people.get(row.inspectorUserId || ""), row.organizationId),
    })),
    clearances: product.clearances.map((row) => ({
      ...row,
      actor: personActor(people.get(row.officerUserId || ""), row.organizationId),
    })),
  }));
}
