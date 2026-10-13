import { afterEach, describe, expect, it } from "vitest";
import { isMailConfigured } from "../src/lib/mail";

describe("Workspace SMTP configuration", () => {
  const previous = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };

  afterEach(() => {
    if (previous.user === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = previous.user;
    if (previous.pass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = previous.pass;
  });

  it("stays unconfigured until a Workspace user and app password are set", () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    expect(isMailConfigured()).toBe(false);
    process.env.SMTP_USER = "notifications@arso-oran.org";
    process.env.SMTP_PASS = "abcd efgh ijkl mnop";
    expect(isMailConfigured()).toBe(true);
  });
});
