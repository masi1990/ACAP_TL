import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

type SendMailInput = { to: string; cc?: string | string[]; subject: string; text: string };

function truthy(raw: string | undefined) {
  const value = raw?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

/** Workspace SMTP settings. Missing user or app password means mail stays queued. */
export function mailConfig(): MailConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
  };
}

export function isMailConfigured() {
  return mailConfig() !== null;
}

function mailOutboxDir(): string | null {
  if (!truthy(process.env.MAIL_OUTBOX)) return null;
  const custom = process.env.MAIL_OUTBOX_DIR?.trim();
  return custom || path.join(process.cwd(), "data", "mail-outbox");
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

export async function sendMail(input: SendMailInput) {
  const cc = Array.isArray(input.cc) ? input.cc.filter(Boolean).join(", ") : input.cc?.trim() || undefined;
  const payload = { to: input.to, cc, subject: input.subject, text: input.text };
  const config = mailConfig();
  if (!config) {
    const outbox = mailOutboxDir();
    if (!outbox) throw new Error("Mail is not configured");
    await writeOutbox(payload, outbox);
    return;
  }
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    requireTLS: config.port === 587,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  await transport.sendMail({
    from: config.from,
    to: input.to,
    cc,
    subject: input.subject,
    text: input.text,
  });
}

export function safeMailError(err: unknown) {
  const raw = err instanceof Error ? err.message : "Send failed";
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const cleaned = pass ? raw.split(pass).join("[redacted]") : raw;
  return cleaned.slice(0, 400);
}
