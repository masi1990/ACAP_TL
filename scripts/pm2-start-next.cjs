/**
 * PM2 entry for acap-tl-web.
 *
 * - Clears any stale listener on the target port (avoids EADDRINUSE → IIS 502)
 * - Starts `next start`
 * - Signals PM2 only after the port accepts connections (wait_ready)
 */
const { spawn, execSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 43123);
const HOST = process.env.HOST || "127.0.0.1";
const READY_TIMEOUT_MS = Number(process.env.PM2_READY_TIMEOUT_MS || 180_000);
const nextCli = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

let child = null;
let shuttingDown = false;

function log(msg) {
  console.log(`[pm2-start-next] ${msg}`);
}

function pidsListeningOnPort(port) {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!/\bLISTENING\b/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const local = parts[1] || "";
      if (!local.endsWith(`:${port}`)) continue;
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0 && pid !== process.pid) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function forceKillTree(pid) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
  } catch {
    try {
      process.kill(pid);
    } catch {
      /* already gone */
    }
  }
}

function clearPort(port) {
  const pids = pidsListeningOnPort(port);
  if (!pids.length) return;
  log(`clearing stale listener(s) on :${port} → pid ${pids.join(", ")}`);
  for (const pid of pids) forceKillTree(pid);
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (!pidsListeningOnPort(port).length) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  const leftover = pidsListeningOnPort(port);
  if (leftover.length) {
    throw new Error(`port ${port} still held by pid ${leftover.join(", ")}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitUntilAccepting(host, port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child && child.exitCode !== null) {
      throw new Error(`next exited before listen (code ${child.exitCode})`);
    }
    if (await canConnect(host, port)) return;
    await sleep(250);
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${host}:${port}`);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`shutdown (${signal})`);
  if (!child || child.exitCode !== null) {
    process.exit(0);
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  const killTimer = setTimeout(() => {
    if (child && child.exitCode === null) {
      log(`force-killing next pid ${child.pid}`);
      forceKillTree(child.pid);
    }
  }, 8_000);
  child.once("exit", (code) => {
    clearTimeout(killTimer);
    process.exit(code ?? 0);
  });
}

async function main() {
  clearPort(PORT);

  child = spawn(
    process.execPath,
    [nextCli, "start", "-p", String(PORT), "-H", HOST],
    {
      cwd: ROOT,
      env: process.env,
      stdio: ["inherit", "inherit", "inherit"],
      windowsHide: true,
    },
  );

  child.on("error", (err) => {
    console.error("[pm2-start-next] failed to spawn next", err);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    log(`next exited code=${code} signal=${signal}`);
    process.exit(code ?? 1);
  });

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("message", (msg) => {
    if (msg === "shutdown") shutdown("pm2-shutdown");
  });

  log(`waiting for ${HOST}:${PORT} (timeout ${READY_TIMEOUT_MS}ms)`);
  await waitUntilAccepting(HOST, PORT, READY_TIMEOUT_MS);
  log("port accepting connections — signaling ready");
  if (typeof process.send === "function") {
    process.send("ready");
  }
}

main().catch((err) => {
  console.error("[pm2-start-next]", err);
  shutdown("startup-error");
  setTimeout(() => process.exit(1), 9_000).unref();
});
