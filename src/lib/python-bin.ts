import { execFile } from "child_process";
import { access } from "fs/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const CANDIDATES = [
  process.env.PYTHON,
  "python3",
  "python",
  "C:\\Program Files\\Python312\\python.exe",
  "C:\\Program Files\\Python313\\python.exe",
].filter((value): value is string => Boolean(value));

let resolved: Promise<string> | null = null;

async function probe(candidate: string) {
  if (candidate.includes("\\") || candidate.includes("/")) {
    await access(candidate);
    return;
  }
  await execFileAsync(candidate, ["--version"], { timeout: 8_000 });
}

/** python3 on PATH, otherwise the Windows all-users install. */
export function resolvePython(): Promise<string> {
  if (!resolved) {
    resolved = (async () => {
      for (const candidate of CANDIDATES) {
        try {
          await probe(candidate);
          return candidate;
        } catch {
          // try the next interpreter
        }
      }
      throw new Error(
        "PDF import needs Python with PyMuPDF. Install Python 3.12 and run: python -m pip install pymupdf==1.24.14 pillow",
      );
    })();
  }
  return resolved;
}
