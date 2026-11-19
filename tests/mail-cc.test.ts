import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

describe("sendMail cc", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "mail-cc-"));
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
    process.env.MAIL_OUTBOX = "1";
    process.env.MAIL_OUTBOX_DIR = dir;
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes Cc into the outbox file", async () => {
    const { sendMail } = await import("../src/lib/mail");
    await sendMail({ to: "ops@example.com", cc: "user@example.com", subject: "Hi", text: "Body" });
    const { readdir } = await import("fs/promises");
    const files = await readdir(dir);
    const body = await readFile(path.join(dir, files[0]!), "utf8");
    expect(body).toContain("To: ops@example.com");
    expect(body).toContain("Cc: user@example.com");
  });
});
