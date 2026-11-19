import { afterEach, describe, expect, it } from "vitest";
import { isMailConfigured, mailConfig, mailOutboxDir } from "../src/lib/mail";

describe("Workspace SMTP configuration", () => {
  const previous = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    from: process.env.SMTP_FROM,
    notifyFrom: process.env.NOTIFY_FROM,
    outbox: process.env.MAIL_OUTBOX,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries({
      SMTP_USER: previous.user,
      SMTP_PASS: previous.pass,
      SMTP_PORT: previous.port,
      SMTP_SECURE: previous.secure,
      SMTP_FROM: previous.from,
      NOTIFY_FROM: previous.notifyFrom,
      MAIL_OUTBOX: previous.outbox,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses SMTP when a Workspace user and app password are set", () => {
    process.env.MAIL_OUTBOX = "0";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    expect(mailConfig()).toBeNull();
    expect(isMailConfigured()).toBe(false);
    process.env.SMTP_USER = "jerutom@arso-oran.org";
    process.env.SMTP_PASS = "abcd efgh ijkl mnop";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.NOTIFY_FROM = "jerutom@arso-oran.org";
    expect(mailConfig()?.user).toBe("jerutom@arso-oran.org");
    expect(mailConfig()?.pass).toBe("abcd efgh ijkl mnop");
    expect(mailConfig()?.secure).toBe(true);
    expect(mailConfig()?.from).toBe("jerutom@arso-oran.org");
    expect(isMailConfigured()).toBe(true);
  });

  it("falls back to a local outbox when SMTP is missing", () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_OUTBOX;
    expect(mailConfig()).toBeNull();
    expect(mailOutboxDir()).toContain("mail-outbox");
    expect(isMailConfigured()).toBe(true);
  });
});
