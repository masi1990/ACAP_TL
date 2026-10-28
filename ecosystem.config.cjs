/**
 * PM2 — ACAP Trade sandbox (test-acap.arso-oran.org)
 *
 * IIS reverse-proxies HTTPS to this Next.js process on port 43123.
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Reload: pm2 restart acap-tl-web
 */
const path = require("node:path");

const root = __dirname;
const nextCli = path.join(root, "node_modules/next/dist/bin/next");

module.exports = {
  apps: [
    {
      name: "acap-tl-web",
      cwd: root,
      script: nextCli,
      args: "start -p 43123 -H 127.0.0.1",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      autorestart: true,
      max_restarts: 999,
      min_uptime: "10s",
      restart_delay: 3000,
      exp_backoff_restart_delay: 200,
      kill_timeout: 5000,
      listen_timeout: 15000,
    },
  ],
};
