import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const ROOT = path.join(process.cwd(), "storage", "dossier");

export async function storeDossierFile(file: File) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "document";
  const stored = `${randomBytes(8).toString("hex")}-${safeName}`;
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, stored), Buffer.from(await file.arrayBuffer()));
  return {
    filename: file.name || safeName,
    contentType: file.type || "application/octet-stream",
    storageUri: stored,
  };
}

export function dossierFilePath(storageUri: string) {
  const base = path.basename(storageUri);
  if (!base || base !== storageUri) throw new Error("Invalid file");
  return path.join(ROOT, base);
}

export async function readDossierFile(storageUri: string) {
  return readFile(dossierFilePath(storageUri));
}

export async function removeDossierFile(storageUri: string) {
  try {
    await unlink(dossierFilePath(storageUri));
  } catch {
    // The row can be replaced even when the previous file is already gone.
  }
}
