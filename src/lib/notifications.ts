import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { isLocale } from "./i18n";
import { isMailConfigured, safeMailError, sendMail } from "./mail";

const MAX_ATTEMPTS = 5;
const RETRY_MS = 15 * 60 * 1000;
const LICENSE_MONTHS = [6, 3, 1, 0] as const;

export const NotificationKind = {
  ORG_INVITE: "ORG_INVITE",
  ACCOUNT_WELCOME: "ACCOUNT_WELCOME",
  PASSWORD_RESET: "PASSWORD_RESET",
  COC_ISSUED: "COC_ISSUED",
  STORE_FULFILLED: "STORE_FULFILLED",
  COMPLAINT_RECEIVED: "COMPLAINT_RECEIVED",
  COMPLAINT_ROUTED: "COMPLAINT_ROUTED",
  CUSTOMS_DECISION: "CUSTOMS_DECISION",
  INSPECTION_NON_CONFORM: "INSPECTION_NON_CONFORM",
  SURVEILLANCE_OPENED: "SURVEILLANCE_OPENED",
  SANCTION_APPLIED: "SANCTION_APPLIED",
  EXPIRY_REMINDER: "EXPIRY_REMINDER",
  COC_EXPIRED: "COC_EXPIRED",
  CB_LICENSE_EXPIRY: "CB_LICENSE_EXPIRY",
  LIBRARY_ROLE_ASSIGNED: "LIBRARY_ROLE_ASSIGNED",
  LIBRARY_RELEASE: "LIBRARY_RELEASE",
} as const;

type JobDb = Prisma.TransactionClient | PrismaClient;

export type EnqueueInput = {
  kind: string;
  dedupeKey: string;
  scheduledFor?: Date;
  cocId?: string | null;
  monthsOut?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

type Prepared =
  | { subject: string; text: string; recipients: string[] }
  | { drop: "sent" | "failed"; reason: string };

function appBase() {
  return (process.env.APP_BASE_URL?.trim() || "http://127.0.0.1:43123").replace(/\/$/, "");
}

function addEmail(bucket: Set<string>, raw: string | null | undefined) {
  const email = String(raw || "").trim().toLowerCase();
  if (email.includes("@")) bucket.add(email);
}

function onlyEmails(values: Array<string | undefined>) {
  return values.filter((email): email is string => Boolean(email && email.includes("@")));
}

function payloadOf(payloadJson: string) {
  try {
    const value = JSON.parse(payloadJson) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item == null) continue;
      out[key] = String(item);
    }
    return out;
  } catch {
    return {};
  }
}

function day(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function emailsForOrganizations(orgIds: Array<string | null | undefined>) {
  const ids = [...new Set(orgIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return [];
  const orgs = await prisma.organization.findMany({
    where: { id: { in: ids } },
    select: {
      contactEmail: true,
      memberships: { select: { user: { select: { email: true } } } },
    },
  });
  const emails = new Set<string>();
  for (const org of orgs) {
    addEmail(emails, org.contactEmail);
    for (const membership of org.memberships) addEmail(emails, membership.user.email);
  }
  return [...emails];
}

export async function arsoAdminEmails() {
  const users = await prisma.userAccount.findMany({
    where: {
      OR: [
        { rolesGlobal: { contains: "ARSO_ADMIN" } },
        { roleAssignments: { some: { roleCode: "ARSO_ADMIN" } } },
      ],
    },
    select: { email: true },
  });
  const emails = new Set<string>();
  for (const user of users) addEmail(emails, user.email);
  return [...emails];
}

async function productParties(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      company: { include: { clientAccount: true } },
      applications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!product) return null;
  const certified = product.applications.find((row) => row.status === "CERTIFIED") ?? product.applications[0];
  return {
    name: product.name,
    manufacturerOrgId: product.company.clientAccount.organizationId,
    cbOrgId: certified?.organizationId ?? null,
  };
}

async function cocContext(cocId: string) {
  return prisma.coC.findUnique({
    where: { id: cocId },
    include: {
      application: {
        include: {
          organization: { select: { id: true, name: true } },
          product: {
            select: {
              name: true,
              company: { select: { clientAccount: { select: { organizationId: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function enqueueNotification(input: EnqueueInput, db?: JobDb) {
  const writer = db ?? prisma;
  const data = {
    kind: input.kind,
    dedupeKey: input.dedupeKey,
    scheduledFor: input.scheduledFor ?? new Date(),
    cocId: input.cocId ?? null,
    monthsOut: input.monthsOut ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    payloadJson: JSON.stringify(input.payload ?? {}),
    status: "PENDING",
  };
  const existing = await writer.notificationJob.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing) {
    if (existing.status !== "PENDING") return existing;
    return writer.notificationJob.update({
      where: { id: existing.id },
      data: {
        scheduledFor: data.scheduledFor,
        payloadJson: data.payloadJson,
        cocId: data.cocId,
        monthsOut: data.monthsOut,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  }
  try {
    return await writer.notificationJob.create({ data });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      const row = await writer.notificationJob.findUnique({ where: { dedupeKey: input.dedupeKey } });
      if (row) return row;
    }
    throw err;
  }
}

async function organizationName(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  return organization?.name || "your organization";
}

export async function queueOrgInvite(invitationId: string) {
  const invite = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invite) return;
  await enqueueNotification({
    kind: NotificationKind.ORG_INVITE,
    dedupeKey: `${NotificationKind.ORG_INVITE}:${invite.id}:now`,
    entityType: "Invitation",
    entityId: invite.id,
    payload: {
      email: invite.email,
      role: invite.role,
      organizationName: await organizationName(invite.organizationId),
      token: invite.token,
    },
  });
}

export async function queuePasswordReset(input: { resetId: string; email: string; name: string; token: string }) {
  await enqueueNotification({
    kind: NotificationKind.PASSWORD_RESET,
    dedupeKey: `${NotificationKind.PASSWORD_RESET}:${input.resetId}`,
    entityType: "PasswordReset",
    entityId: input.resetId,
    payload: { email: input.email, name: input.name, token: input.token },
  });
}

export async function queueAccountWelcome(input: {
  userId: string;
  email: string;
  name: string;
  temporaryPassword: string;
}) {
  await enqueueNotification({
    kind: NotificationKind.ACCOUNT_WELCOME,
    dedupeKey: `${NotificationKind.ACCOUNT_WELCOME}:${input.userId}:now`,
    entityType: "UserAccount",
    entityId: input.userId,
    payload: {
      email: input.email,
      name: input.name,
      temporaryPassword: input.temporaryPassword,
    },
  });
}

export async function queueLibraryRoleAssigned(input: {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
}) {
  await enqueueNotification({
    kind: NotificationKind.LIBRARY_ROLE_ASSIGNED,
    dedupeKey: `${NotificationKind.LIBRARY_ROLE_ASSIGNED}:${input.userId}:${Date.now()}`,
    entityType: "UserAccount",
    entityId: input.userId,
    payload: input,
  });
}

export async function queueLibraryRelease(input: {
  releaseId: string;
  email: string;
  name: string;
  token: string;
  hasAccount: boolean;
  titles: string[];
}) {
  await enqueueNotification({
    kind: NotificationKind.LIBRARY_RELEASE,
    dedupeKey: `${NotificationKind.LIBRARY_RELEASE}:${input.releaseId}`,
    entityType: "LibraryRelease",
    entityId: input.releaseId,
    payload: {
      email: input.email,
      name: input.name,
      token: input.token,
      hasAccount: input.hasAccount ? "yes" : "no",
      titles: input.titles.join(" | "),
    },
  });
}

export async function queueStoreFulfilled(input: {
  orderId: string;
  buyerEmail: string;
  buyerName: string;
  title: string;
  artifactUri: string;
  locale?: string;
  editionLocale?: string;
  languages?: string[];
  items?: { catalogItemId: string; title: string; languages: string[] }[];
}) {
  const dedupeKey = `${NotificationKind.STORE_FULFILLED}:${input.orderId}:now`;
  const existing = await prisma.notificationJob.findUnique({ where: { dedupeKey } });
  if (existing?.status === "SENT") return existing;
  if (existing && existing.status !== "PENDING") {
    return prisma.notificationJob.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        attempts: 0,
        lastError: null,
        scheduledFor: new Date(),
        payloadJson: JSON.stringify(input),
      },
    });
  }
  await enqueueNotification({
    kind: NotificationKind.STORE_FULFILLED,
    dedupeKey,
    entityType: "Order",
    entityId: input.orderId,
    payload: input,
  });
}

export async function queueComplaintEmails(input: {
  complaintId: string;
  email: string;
  subject: string;
  routedCbId: string | null;
}) {
  await enqueueNotification({
    kind: NotificationKind.COMPLAINT_RECEIVED,
    dedupeKey: `${NotificationKind.COMPLAINT_RECEIVED}:${input.complaintId}:now`,
    entityType: "ConsumerComplaint",
    entityId: input.complaintId,
    payload: { email: input.email, subject: input.subject },
  });
  if (input.routedCbId) {
    await enqueueNotification({
      kind: NotificationKind.COMPLAINT_ROUTED,
      dedupeKey: `${NotificationKind.COMPLAINT_ROUTED}:${input.complaintId}:now`,
      entityType: "ConsumerComplaint",
      entityId: input.complaintId,
      payload: { routedCbId: input.routedCbId, subject: input.subject, email: input.email },
    });
  }
}

export async function queueCustomsDecision(input: {
  clearanceId: string;
  productId: string;
  decision: string;
  reason: string;
}) {
  if (input.decision !== "HOLD" && input.decision !== "REFUSE") return;
  await enqueueNotification({
    kind: NotificationKind.CUSTOMS_DECISION,
    dedupeKey: `${NotificationKind.CUSTOMS_DECISION}:${input.clearanceId}:now`,
    entityType: "CustomsClearance",
    entityId: input.clearanceId,
    payload: {
      productId: input.productId,
      decision: input.decision,
      reason: input.reason,
    },
  });
}

export async function queueInspectionNonConform(input: {
  inspectionId: string;
  productId: string;
  findings: string;
}) {
  await enqueueNotification({
    kind: NotificationKind.INSPECTION_NON_CONFORM,
    dedupeKey: `${NotificationKind.INSPECTION_NON_CONFORM}:${input.inspectionId}:now`,
    entityType: "ConformityInspection",
    entityId: input.inspectionId,
    payload: { productId: input.productId, findings: input.findings },
  });
}

export async function queueSurveillanceOpened(input: {
  caseId: string;
  title: string;
  cbOrgId: string | null;
  pinCode?: string | null;
}) {
  if (!input.cbOrgId) return;
  await enqueueNotification({
    kind: NotificationKind.SURVEILLANCE_OPENED,
    dedupeKey: `${NotificationKind.SURVEILLANCE_OPENED}:${input.caseId}:now`,
    entityType: "SurveillanceCase",
    entityId: input.caseId,
    payload: {
      title: input.title,
      cbOrgId: input.cbOrgId,
      pinCode: input.pinCode ?? "",
    },
  });
}

export async function queueSanction(input: { caseId: string; cocId: string; pinCode: string }) {
  await enqueueNotification({
    kind: NotificationKind.SANCTION_APPLIED,
    dedupeKey: `${NotificationKind.SANCTION_APPLIED}:${input.caseId}:now`,
    cocId: input.cocId,
    entityType: "SurveillanceCase",
    entityId: input.caseId,
    payload: { pinCode: input.pinCode },
  });
}

export async function syncCbLicenseReminders(licenseId: string) {
  const license = await prisma.cbLicense.findUnique({ where: { id: licenseId } });
  if (!license) return;
  const inactive =
    !license.expiresAt ||
    license.status === "SUSPENDED" ||
    license.status === "WITHDRAWN" ||
    license.status === "EXPIRED";
  if (inactive) {
    await prisma.notificationJob.deleteMany({
      where: { kind: NotificationKind.CB_LICENSE_EXPIRY, entityId: license.id, status: "PENDING" },
    });
    return;
  }
  const expiresAt = license.expiresAt!;
  for (const monthsOut of LICENSE_MONTHS) {
    const scheduledFor = new Date(expiresAt);
    if (monthsOut > 0) scheduledFor.setMonth(scheduledFor.getMonth() - monthsOut);
    const dedupeKey = `${NotificationKind.CB_LICENSE_EXPIRY}:${license.id}:${monthsOut}`;
    if (monthsOut > 0 && scheduledFor.getTime() < Date.now() - 60_000) {
      await prisma.notificationJob.deleteMany({ where: { dedupeKey, status: "PENDING" } });
      continue;
    }
    await enqueueNotification({
      kind: NotificationKind.CB_LICENSE_EXPIRY,
      dedupeKey,
      scheduledFor,
      monthsOut,
      entityType: "CbLicense",
      entityId: license.id,
      payload: { licenseNumber: license.licenseNumber, cbOrgId: license.organizationId },
    });
  }
}

/** Send due jobs. No-op when SMTP is unset so rows stay PENDING. */
export async function dispatchDueNotifications(limit = 20, onlyIds?: string[]) {
  if (!isMailConfigured()) return { configured: false, sent: 0, failed: 0 };
  const due = await prisma.notificationJob.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
      ...(onlyIds ? { id: { in: onlyIds } } : {}),
    },
    orderBy: { scheduledFor: "asc" },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  for (const job of due) {
    try {
      await applyJobEffects(job);
      const prepared = await prepareJob(job);
      if ("drop" in prepared) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: prepared.drop === "sent" ? "SENT" : "FAILED",
            sentAt: prepared.drop === "sent" ? new Date() : null,
            lastError: prepared.reason || null,
          },
        });
        if (prepared.drop === "sent") sent += 1;
        else failed += 1;
        continue;
      }
      if (prepared.recipients.length === 0) {
        await recordFailure(job.id, job.attempts, job.scheduledFor, "No recipient");
        failed += 1;
        continue;
      }
      for (const to of prepared.recipients) {
        await sendMail({ to, subject: prepared.subject, text: prepared.text });
      }
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      sent += 1;
    } catch (err) {
      await recordFailure(job.id, job.attempts, job.scheduledFor, safeMailError(err));
      failed += 1;
    }
  }
  return { configured: true, sent, failed };
}

export async function notifyAfterCommit() {
  if (process.env.VITEST) return;
  try {
    await dispatchDueNotifications();
  } catch (err) {
    console.error("notification dispatch failed", safeMailError(err));
  }
}

async function recordFailure(id: string, attempts: number, scheduledFor: Date, message: string) {
  const nextAttempts = attempts + 1;
  await prisma.notificationJob.update({
    where: { id },
    data: {
      attempts: nextAttempts,
      lastError: message,
      status: nextAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
      scheduledFor:
        nextAttempts >= MAX_ATTEMPTS ? scheduledFor : new Date(Date.now() + RETRY_MS),
    },
  });
}

async function applyJobEffects(job: { kind: string; cocId: string | null; entityId: string | null; monthsOut: number | null }) {
  if (job.kind === NotificationKind.COC_EXPIRED && job.cocId) {
    await prisma.coC.updateMany({
      where: { id: job.cocId, status: "certified" },
      data: { status: "expired" },
    });
    await prisma.productPin.updateMany({
      where: { cocId: job.cocId, status: "certified" },
      data: { status: "expired" },
    });
  }
  if (job.kind === NotificationKind.CB_LICENSE_EXPIRY && job.monthsOut === 0 && job.entityId) {
    await prisma.cbLicense.updateMany({
      where: {
        id: job.entityId,
        status: { notIn: ["SUSPENDED", "WITHDRAWN", "EXPIRED"] },
      },
      data: { status: "EXPIRED" },
    });
  }
}

async function prepareJob(job: {
  kind: string;
  cocId: string | null;
  entityId: string | null;
  monthsOut: number | null;
  payloadJson: string;
}): Promise<Prepared> {
  const payload = payloadOf(job.payloadJson);
  switch (job.kind) {
    case NotificationKind.ORG_INVITE:
      return prepareInvite(job.entityId);
    case NotificationKind.PASSWORD_RESET:
      return {
        recipients: onlyEmails([payload.email]),
        subject: "Set your ACAP–TL password",
        text: [
          `Hello ${payload.name || payload.email},`,
          "",
          "Use this link to set your password. It expires in 24 hours.",
          `${appBase()}/en/reset-password?token=${payload.token}`,
        ].join("\n"),
      };
    case NotificationKind.LIBRARY_ROLE_ASSIGNED:
      return {
        recipients: onlyEmails([payload.email]),
        subject: "Standards officer access",
        text: [
          `Hello ${payload.name || payload.email},`,
          "",
          `You are a standards officer for ${payload.organizationName || "your institution"}.`,
          "This role is for harmonisation and adoption of African standards.",
          `Sign in: ${appBase()}/en/login`,
          "Then open Library under Standards.",
        ].join("\n"),
      };
    case NotificationKind.LIBRARY_RELEASE: {
      const titles = String(payload.titles || "")
        .split("|")
        .map((title) => title.trim())
        .filter(Boolean);
      const link = `${appBase()}/en/library/release/${payload.token}`;
      return {
        recipients: onlyEmails([payload.email]),
        subject: "African standards ready for you",
        text: [
          `Hello ${payload.name || payload.email},`,
          "",
          payload.hasAccount === "yes"
            ? "Sign in to download the standards ARSO selected for you. The link does not download the file by itself."
            : "Create an account from this link, then request the standards officer role. The link does not download the file by itself.",
          link,
          titles.length ? `Standards: ${titles.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    case NotificationKind.ACCOUNT_WELCOME:
      return {
        recipients: onlyEmails([payload.email]),
        subject: "Your ACAP–TL account",
        text: [
          `Hello ${payload.name || payload.email},`,
          "",
          "An administrator created an ACAP–TL account for you.",
          `Sign in: ${appBase()}/en/login`,
          `Email: ${payload.email}`,
          `Temporary password: ${payload.temporaryPassword}`,
          "",
          "Change this password after you sign in.",
        ].join("\n"),
      };
    case NotificationKind.COC_ISSUED:
    case NotificationKind.EXPIRY_REMINDER:
    case NotificationKind.COC_EXPIRED:
    case NotificationKind.SANCTION_APPLIED:
      return prepareCocMail(job.kind, job.cocId, job.monthsOut, payload.pinCode);
    case NotificationKind.STORE_FULFILLED: {
      const locale = isLocale(String(payload.locale || "")) ? String(payload.locale) : "en";
      const orderId = String(payload.orderId || "");
      const names: Record<string, string> = {
        en: "English",
        fr: "French",
        pt: "Portuguese",
        ar: "Arabic",
      };
      const items = Array.isArray(payload.items)
        ? payload.items.flatMap((entry) => {
            const row = entry as { catalogItemId?: unknown; title?: unknown; languages?: unknown };
            const catalogItemId = String(row.catalogItemId || "");
            if (!catalogItemId) return [];
            const languages = Array.isArray(row.languages)
              ? row.languages.map((code) => String(code)).filter((code) => code in names)
              : [];
            return [{ catalogItemId, title: String(row.title || "ARSO standard"), languages }];
          })
        : [];
      const linkFor = (catalogItemId: string, code: string) => {
        const item = catalogItemId ? `&item=${encodeURIComponent(catalogItemId)}` : "";
        return `${appBase()}/${locale}/api/store/download?order=${encodeURIComponent(orderId)}${item}&lang=${code}`;
      };
      if (items.length > 0) {
        const blocks = items.flatMap((item) => {
          const languages = item.languages.length > 0 ? item.languages : ["en"];
          return [
            item.title,
            ...languages.map((code) => `${names[code] || code}: ${linkFor(item.catalogItemId, code)}`),
            "",
          ];
        });
        const subject =
          items.length === 1
            ? `Your standard is ready: ${items[0].title}`
            : `Your standards are ready (${items.length})`;
        return {
          recipients: onlyEmails([payload.buyerEmail || payload.email]),
          subject,
          text: [
            `Hello ${payload.buyerName || "there"},`,
            "",
            items.length === 1
              ? `Payment for ${items[0].title} is complete.`
              : `Payment for ${items.length} standards is complete.`,
            "Choose the language you want to download:",
            "",
            ...blocks,
          ].join("\n"),
        };
      }
      const languages = Array.isArray(payload.languages)
        ? payload.languages.map((code) => String(code)).filter((code) => code in names)
        : [];
      const links =
        languages.length > 0
          ? languages.map((code) => `${names[code]}: ${linkFor("", code)}`)
          : [`Download: ${appBase()}/${locale}/api/store/download?order=${encodeURIComponent(orderId)}`];
      return {
        recipients: onlyEmails([payload.buyerEmail || payload.email]),
        subject: `Your standard is ready: ${payload.title || "ARSO standard"}`,
        text: [
          `Hello ${payload.buyerName || "there"},`,
          "",
          `Payment for ${payload.title || "your standard"} is complete.`,
          "Choose the language you want to download:",
          ...links,
        ].join("\n"),
      };
    }
    case NotificationKind.COMPLAINT_RECEIVED:
      return {
        recipients: onlyEmails([payload.email]),
        subject: "We received your complaint",
        text: [
          "Your complaint has been recorded.",
          payload.subject ? `Subject: ${payload.subject}` : "",
          "The certification body responsible for the product will review it.",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    case NotificationKind.COMPLAINT_ROUTED:
      return {
        recipients: await emailsForOrganizations([payload.routedCbId]),
        subject: "Consumer complaint routed to your certification body",
        text: [
          "A consumer complaint has been routed to your certification body.",
          payload.subject ? `Subject: ${payload.subject}` : "",
          payload.email ? `Complainant: ${payload.email}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    case NotificationKind.CUSTOMS_DECISION: {
      const parties = payload.productId ? await productParties(payload.productId) : null;
      return {
        recipients: await emailsForOrganizations([parties?.manufacturerOrgId, parties?.cbOrgId]),
        subject: `Customs ${payload.decision === "HOLD" ? "hold" : "refusal"}: ${parties?.name || "product"}`,
        text: [
          `Customs ${payload.decision === "HOLD" ? "held" : "refused"} ${parties?.name || "a product"}.`,
          payload.reason ? `Reason: ${payload.reason}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    case NotificationKind.INSPECTION_NON_CONFORM: {
      const parties = payload.productId ? await productParties(payload.productId) : null;
      return {
        recipients: await emailsForOrganizations([parties?.manufacturerOrgId, parties?.cbOrgId]),
        subject: `Non-conformity: ${parties?.name || "product"}`,
        text: [
          `${parties?.name || "A product"} did not conform at inspection.`,
          payload.findings ? `Findings: ${payload.findings}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    case NotificationKind.SURVEILLANCE_OPENED:
      return {
        recipients: await emailsForOrganizations([payload.cbOrgId]),
        subject: `Surveillance case: ${payload.title || "opened"}`,
        text: [
          "A market surveillance case has been opened on a certificate you issued.",
          payload.title ? `Title: ${payload.title}` : "",
          payload.pinCode ? `PIN: ${payload.pinCode}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    case NotificationKind.CB_LICENSE_EXPIRY:
      return prepareLicense(job.entityId, job.monthsOut);
    default:
      return { drop: "failed", reason: `Unknown notification kind ${job.kind}` };
  }
}

async function prepareInvite(invitationId: string | null): Promise<Prepared> {
  if (!invitationId) return { drop: "failed", reason: "Invitation not found" };
  const invite = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invite) return { drop: "failed", reason: "Invitation not found" };
  if (invite.acceptedAt) return { drop: "sent", reason: "" };
  if (invite.expiresAt < new Date()) return { drop: "failed", reason: "Invitation expired" };
  const name = await organizationName(invite.organizationId);
  const link = `${appBase()}/en/invite/${invite.token}`;
  return {
    recipients: [invite.email],
    subject: `Invitation to ${name}`,
    text: [
      `You are invited to ${name} on ACAP–TL as ${invite.role}.`,
      "",
      `Accept the invitation: ${link}`,
      `This link expires on ${day(invite.expiresAt)}.`,
    ].join("\n"),
  };
}

async function prepareCocMail(
  kind: string,
  cocId: string | null,
  monthsOut: number | null,
  pinCode: string | undefined,
): Promise<Prepared> {
  if (!cocId) return { drop: "failed", reason: "Certificate not found" };
  const coc = await cocContext(cocId);
  if (!coc) return { drop: "failed", reason: "Certificate not found" };
  if (kind === NotificationKind.EXPIRY_REMINDER && coc.status !== "certified") {
    return { drop: "sent", reason: "Certificate is no longer active" };
  }
  const recipients = await emailsForOrganizations([
    coc.application.product.company.clientAccount.organizationId,
    coc.application.organizationId,
  ]);
  if (kind === NotificationKind.SANCTION_APPLIED) {
    recipients.push(...(await arsoAdminEmails()));
  }
  const unique = [...new Set(recipients)];
  const product = coc.application.product.name;
  const when = day(coc.expiresAt);
  if (kind === NotificationKind.COC_ISSUED) {
    return {
      recipients: unique,
      subject: `Certificate issued: ${coc.certificateNo}`,
      text: [
        `${coc.certificateNo} was issued for ${product}.`,
        `Mark: ${coc.markScheme}`,
        `Expires: ${when}`,
        `Certification body: ${coc.application.organization.name}`,
      ].join("\n"),
    };
  }
  if (kind === NotificationKind.COC_EXPIRED) {
    return {
      recipients: unique,
      subject: `Certificate expired: ${coc.certificateNo}`,
      text: [`${coc.certificateNo} for ${product} expired on ${when}.`, "The certificate and its PINs are now expired."].join(
        "\n",
      ),
    };
  }
  if (kind === NotificationKind.SANCTION_APPLIED) {
    return {
      recipients: unique,
      subject: `Certificate suspended: ${coc.certificateNo}`,
      text: [
        `${coc.certificateNo} for ${product} was suspended after a market surveillance sanction.`,
        pinCode ? `PIN: ${pinCode}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  return {
    recipients: unique,
    subject: `Certificate ${coc.certificateNo} expires in ${monthsOut} months`,
    text: [
      `${coc.certificateNo} for ${product} expires on ${when}.`,
      `This is the ${monthsOut}-month reminder.`,
    ].join("\n"),
  };
}

async function prepareLicense(licenseId: string | null, monthsOut: number | null): Promise<Prepared> {
  if (!licenseId) return { drop: "failed", reason: "Licence not found" };
  const license = await prisma.cbLicense.findUnique({
    where: { id: licenseId },
    include: { organization: true },
  });
  if (!license) return { drop: "failed", reason: "Licence not found" };
  if (license.status === "SUSPENDED" || license.status === "WITHDRAWN") {
    return { drop: "sent", reason: "Licence is no longer active" };
  }
  const recipients = await emailsForOrganizations([license.organizationId]);
  const when = license.expiresAt ? day(license.expiresAt) : "the expiry date";
  if (monthsOut === 0) {
    return {
      recipients,
      subject: `Certification body licence expired: ${license.licenseNumber}`,
      text: [
        `${license.organization.name} licence ${license.licenseNumber} expired on ${when}.`,
        license.status === "EXPIRED" ? "The licence status is now expired." : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  return {
    recipients,
    subject: `Licence ${license.licenseNumber} expires in ${monthsOut} months`,
    text: [
      `${license.organization.name} licence ${license.licenseNumber} expires on ${when}.`,
      `This is the ${monthsOut}-month reminder.`,
    ].join("\n"),
  };
}
