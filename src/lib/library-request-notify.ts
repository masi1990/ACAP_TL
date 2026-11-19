import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isValidEmail } from "@/lib/utils";

const FILE = path.join(process.cwd(), "data", "library-request-cc.json");

type Store = { emails: string[] };

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    const emails = Array.isArray(parsed.emails)
      ? [...new Set(parsed.emails.map((email) => String(email || "").trim().toLowerCase()).filter((email) => isValidEmail(email)))]
      : [];
    return { emails };
  } catch {
    return { emails: [] };
  }
}

export async function listLibraryRequestCcEmails(): Promise<string[]> {
  return (await readStore()).emails;
}

export async function saveLibraryRequestCcEmails(emails: string[]): Promise<string[]> {
  const cleaned = [
    ...new Set(emails.map((email) => String(email || "").trim().toLowerCase()).filter((email) => isValidEmail(email))),
  ].slice(0, 40);
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify({ emails: cleaned }, null, 2)}\n`, "utf8");
  return cleaned;
}
