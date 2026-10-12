import { createHash } from "crypto";
import { prisma } from "./db";

export async function appendAuditEvent(input: {
  actorUserId?: string | null;
  impersonatorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}) {
  const latest = await prisma.auditEvent.findFirst({
    orderBy: { occurredAt: "desc" },
    select: { eventHash: true },
  });
  const prevHash = latest?.eventHash ?? "GENESIS";
  const body = {
    ...input,
    beforeJson: input.before ? JSON.stringify(input.before) : null,
    afterJson: input.after ? JSON.stringify(input.after) : null,
    prevHash,
    occurredAt: new Date().toISOString(),
  };
  const eventHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return prisma.auditEvent.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      impersonatorId: input.impersonatorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      organizationId: input.organizationId ?? null,
      beforeJson: body.beforeJson,
      afterJson: body.afterJson,
      reason: input.reason ?? null,
      prevHash,
      eventHash,
    },
  });
}
