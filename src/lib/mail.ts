import nodemailer from "nodemailer";

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

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

export async function sendMail(input: { to: string; subject: string; text: string }) {
  const config = mailConfig();
  if (!config) throw new Error("Mail is not configured");
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
