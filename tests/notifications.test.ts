import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock("../src/lib/mail", () => ({
  isMailConfigured: () => true,
  sendMail: (...args: unknown[]) => sendMail(...args),
  safeMailError: (err: unknown) => (err instanceof Error ? err.message : "Send failed"),
}));

vi.mock("../src/lib/pdf", () => ({
  generateWatermarkedStandardPdf: vi.fn(async () => "/artifacts/notify-test.pdf"),
}));

import { fulfillPaidOrder } from "../src/lib/store-fulfillment";
import {
  dispatchDueNotifications,
  emailsForOrganizations,
  enqueueNotification,
  queueLibraryStandardRequest,
  queueOrgInvite,
} from "../src/lib/notifications";

const prisma = new PrismaClient();

describe("notification delivery", () => {
  const jobIds: string[] = [];
  let skip = false;
  let actorId = "";
  let orgId = "";

  beforeAll(async () => {
    try {
      const [actor, org] = await Promise.all([
        prisma.userAccount.findFirst(),
        prisma.organization.findFirst(),
      ]);
      if (!actor || !org) {
        skip = true;
        return;
      }
      actorId = actor.id;
      orgId = org.id;
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    if (jobIds.length) await prisma.notificationJob.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.$disconnect();
  });

  it("keeps a single job when the same invite is queued twice", async () => {
    if (skip) return;
    const invite = await prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: `invite-${Date.now()}@example.com`,
        role: "ORG_USER",
        token: `invite-${Date.now().toString(16)}`,
        invitedById: actorId,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await queueOrgInvite(invite.id);
    await queueOrgInvite(invite.id);
    const jobs = await prisma.notificationJob.findMany({
      where: { entityType: "Invitation", entityId: invite.id },
    });
    jobIds.push(...jobs.map((job) => job.id));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.kind).toBe("ORG_INVITE");
    await prisma.invitation.delete({ where: { id: invite.id } });
  });

  it("resolves organization contact and member addresses", async () => {
    if (skip) return;
    const stamp = Date.now();
    const org = await prisma.organization.create({
      data: {
        name: `Notify CB ${stamp}`,
        type: "CB",
        contactEmail: `desk-${stamp}@example.com`,
      },
    });
    const user = await prisma.userAccount.create({
      data: {
        email: `officer-${stamp}@example.com`,
        name: "Notify Officer",
        passwordHash: "x",
        emailVerified: true,
      },
    });
    await prisma.organizationMembership.create({
      data: { organizationId: org.id, userId: user.id, role: "CB_OFFICER" },
    });
    const emails = await emailsForOrganizations([org.id, org.id]);
    expect(emails.sort()).toEqual([`desk-${stamp}@example.com`, `officer-${stamp}@example.com`].sort());

    const job = await enqueueNotification({
      kind: "COMPLAINT_ROUTED",
      dedupeKey: `COMPLAINT_ROUTED:test-${stamp}:now`,
      entityType: "ConsumerComplaint",
      entityId: `complaint-${stamp}`,
      payload: { routedCbId: org.id, subject: "Label", email: "buyer@example.com" },
    });
    jobIds.push(job.id);
    sendMail.mockClear();
    sendMail.mockResolvedValue(undefined);
    const result = await dispatchDueNotifications(5, [job.id]);
    expect(result.sent).toBe(1);
    const sentTo = sendMail.mock.calls.map((call) => (call[0] as { to: string }).to).sort();
    expect(sentTo).toEqual([`desk-${stamp}@example.com`, `officer-${stamp}@example.com`].sort());

    await prisma.organizationMembership.deleteMany({ where: { organizationId: org.id } });
    await prisma.userAccount.delete({ where: { id: user.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  });

  it("retries a failed send and then marks the job failed", async () => {
    if (skip) return;
    const stamp = Date.now();
    const job = await enqueueNotification({
      kind: "COMPLAINT_RECEIVED",
      dedupeKey: `COMPLAINT_RECEIVED:test-${stamp}:now`,
      entityType: "ConsumerComplaint",
      entityId: `complaint-retry-${stamp}`,
      payload: { email: `person-${stamp}@example.com`, subject: "Retry" },
    });
    jobIds.push(job.id);
    sendMail.mockRejectedValue(new Error("smtp down"));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { scheduledFor: new Date(Date.now() - 1000) },
      });
      await dispatchDueNotifications(5, [job.id]);
    }
    const stored = await prisma.notificationJob.findUnique({ where: { id: job.id } });
    expect(stored?.attempts).toBe(5);
    expect(stored?.status).toBe("FAILED");
    expect(stored?.lastError).toContain("smtp down");
  });

  it("enqueues one email when an order is fulfilled", async () => {
    if (skip) return;
    const version = await prisma.standardVersion.findFirst({ include: { catalogItem: true } });
    if (!version) return;
    const createdCatalog = !version.catalogItem;
    const item =
      version.catalogItem ??
      (await prisma.catalogItem.create({
        data: {
          standardVersionId: version.id,
          priceCents: 1000,
          coverTitle: "Notify standard",
        },
      }));
    const order = await prisma.order.create({
      data: {
        buyerEmail: `buyer-${Date.now()}@example.com`,
        buyerName: "Notify Buyer",
        status: "CHECKOUT",
        totalCents: item.priceCents,
        lines: { create: { catalogItemId: item.id, unitPriceCents: item.priceCents } },
      },
    });
    try {
      await fulfillPaidOrder({ orderId: order.id });
      await fulfillPaidOrder({ orderId: order.id });
      const jobs = await prisma.notificationJob.findMany({
        where: { kind: "STORE_FULFILLED", entityId: order.id },
      });
      jobIds.push(...jobs.map((job) => job.id));
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.payloadJson).toContain(order.buyerEmail);
    } finally {
      await prisma.notificationJob.deleteMany({ where: { entityId: order.id } });
      await prisma.standardEntitlement.deleteMany({ where: { orderId: order.id } });
      await prisma.orderLine.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      if (createdCatalog) await prisma.catalogItem.delete({ where: { id: item.id } });
    }
  });

  it("queues LIBRARY_STANDARD_REQUEST and sends to admin with requestor cc only", async () => {
    if (skip) return;
    const stamp = Date.now();
    const requestId = `req-${stamp}`;
    const previousAdmin = process.env.NOTIFY_ADMIN;
    process.env.NOTIFY_ADMIN = `admin-${stamp}@example.com`;
    try {
      await queueLibraryStandardRequest({
        requestId,
        email: `officer-${stamp}@example.com`,
        name: "Req Officer",
        organizationName: "Req Org",
        countryName: "Kenya",
        note: "Please prioritise",
        lines: ["ARS 1: Cement", "ARS 2: Steel"],
      });
      const jobs = await prisma.notificationJob.findMany({
        where: { kind: "LIBRARY_STANDARD_REQUEST", entityId: requestId },
      });
      jobIds.push(...jobs.map((job) => job.id));
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.payloadJson).toContain(`officer-${stamp}@example.com`);
      expect(jobs[0]?.payloadJson).toContain("ARS 1: Cement | ARS 2: Steel");

      sendMail.mockClear();
      sendMail.mockResolvedValue(undefined);
      const result = await dispatchDueNotifications(5, [jobs[0]!.id]);
      expect(result.sent).toBe(1);
      expect(sendMail).toHaveBeenCalledTimes(1);
      const call = sendMail.mock.calls[0]![0] as { to: string; cc?: string[]; text: string; subject: string };
      expect(call.to).toBe(`admin-${stamp}@example.com`);
      expect(call.cc).toEqual([`officer-${stamp}@example.com`]);
      expect(call.subject).toContain("Req Officer");
      expect(call.text).toContain("- ARS 1: Cement");
      expect(call.text).toContain("- ARS 2: Steel");
      expect(call.text).toContain("Note: Please prioritise");
    } finally {
      if (previousAdmin === undefined) delete process.env.NOTIFY_ADMIN;
      else process.env.NOTIFY_ADMIN = previousAdmin;
    }
  });
});
