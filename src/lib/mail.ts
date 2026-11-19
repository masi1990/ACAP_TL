import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  admin: string | null;
};

type SendMailInput = { to: string; cc?: string | string[]; subject: string; text: string };

function truthy(raw: string | undefined) {
  const value = raw?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

/** Workspace SMTP settings. Missing user or app password means SMTP is unavailable. */
export function mailConfig(): MailConfig | null {
  const user = process.env.SMTP_USER?.trim();
  // Keep Google app-password spacing exactly as provided (only trim ends).
  const pass = process.env.SMTP_PASS?.trim() || "";
  if (!user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? truthy(process.env.SMTP_SECURE)
      : Number.isFinite(port) && port === 465;
  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number.isFinite(port) ? port : 587,
    secure,
    user,
    pass,
    from: process.env.NOTIFY_FROM?.trim() || process.env.SMTP_FROM?.trim() || user,
    admin: process.env.NOTIFY_ADMIN?.trim() || null,
  };
}

/** Write messages under data/mail-outbox when SMTP is unset (UAT / local). */
export function mailOutboxDir(): string | null {
  const raw = process.env.MAIL_OUTBOX?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return null;
  if (mailConfig()) return null;
  // Default on when SMTP is missing so queued notifications still leave PENDING.
  if (raw === "1" || raw === "true" || raw === "on" || raw === undefined || raw === "") {
    const custom = process.env.MAIL_OUTBOX_DIR?.trim();
    return custom || path.join(process.cwd(), "data", "mail-outbox");
  }
  return null;
}

export function isMailConfigured() {
  return mailConfig() !== null || mailOutboxDir() !== null;
}

async function writeOutbox(input: { to: string; cc?: string; subject: string; text: string }, dir: string) {
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTo = input.to.replace(/[^a-zA-Z0-9@._-]/g, "_").slice(0, 80);
  const file = path.join(dir, `${stamp}-${safeTo}.txt`);
  await writeFile(
    file,
    [
      `To: ${input.to}`,
      ...(input.cc ? [`Cc: ${input.cc}`] : []),
      `Subject: ${input.subject}`,
      "",
      input.text,
      "",
    ].join("\n"),
    "utf8",
  );
  return file;
}

/** Outbox path even when SMTP is configured — used as fallback if Gmail rejects login. */
function outboxFallbackDir() {
  const raw = process.env.MAIL_OUTBOX?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return null;
  const custom = process.env.MAIL_OUTBOX_DIR?.trim();
  return custom || path.join(process.cwd(), "data", "mail-outbox");
}

export async function sendMail(input: SendMailInput) {
  const cc = Array.isArray(input.cc) ? input.cc.filter(Boolean).join(", ") : input.cc?.trim() || undefined;
  const payload = { to: input.to, cc, subject: input.subject, text: input.text };
  const config = mailConfig();
  if (config) {
    try {
      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        requireTLS: !config.secure && config.port === 587,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      });
      await transport.sendMail({
        from: config.from,
        to: input.to,
        cc,
        subject: input.subject,
        text: input.text,
      });
      return { channel: "smtp" as const };
    } catch (err) {
      const fallback = outboxFallbackDir();
      if (!fallback) throw err;
      console.error("SMTP send failed; writing outbox copy", safeMailError(err));
      const file = await writeOutbox(payload, fallback);
      return { channel: "outbox" as const, file, smtpError: safeMailError(err) };
    }
  }

  const outbox = mailOutboxDir();
  if (!outbox) throw new Error("Mail is not configured");
  const file = await writeOutbox(payload, outbox);
  return { channel: "outbox" as const, file };
}

export function safeMailError(err: unknown) {
  const raw = err instanceof Error ? err.message : "Send failed";
  const passExact = process.env.SMTP_PASS?.trim() || "";
  const passCompact = passExact.replace(/\s+/g, "");
  let cleaned = raw;
  if (passExact) cleaned = cleaned.split(passExact).join("[redacted]");
  if (passCompact && passCompact !== passExact) cleaned = cleaned.split(passCompact).join("[redacted]");
  return cleaned.slice(0, 400);
}
