import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export class ComplaintPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplaintPhotoError";
  }
}

export async function storeComplaintPhoto(
  file: File | null | undefined,
  kind: "label" | "mark" | "receipt",
): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size <= 0) return null;
  if (file.size > MAX_BYTES) {
    throw new ComplaintPhotoError(`${kind} photo must be 5 MB or smaller`);
  }
  const ext = ALLOWED.get(file.type) || ALLOWED.get(file.type.toLowerCase());
  if (!ext) {
    throw new ComplaintPhotoError(`${kind} photo must be JPEG, PNG, or WebP`);
  }

  const dir = path.join(process.cwd(), "public", "uploads", "complaints");
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${randomBytes(3).toString("hex")}-${kind}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buf);
  return `/uploads/complaints/${storedName}`;
}
