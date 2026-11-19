import { existsSync, statSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

function resolveUpload(parts: string[]) {
  if (!parts.length) return null;
  if (parts.some((part) => part === ".." || part === "." || part.includes("\0"))) return null;
  const abs = path.resolve(UPLOAD_ROOT, ...parts);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep) && abs !== UPLOAD_ROOT) return null;
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  return abs;
}

/** Always read preview/upload bytes from disk (survives files created after `next start`). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const file = resolveUpload(parts || []);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(file).toLowerCase();
  const type = CONTENT_TYPES[ext] || "application/octet-stream";
  const stat = statSync(file);
  const body = await readFile(file);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "Last-Modified": stat.mtime.toUTCString(),
    },
  });
}
