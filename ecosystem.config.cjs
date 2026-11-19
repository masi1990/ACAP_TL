/**
 * PM2 — ACAP Trade under https://acap.arso-oran.org/arso
 *
 * Remote IIS (197.232.15.68) reverse-proxies /arso* to this host:43123.
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Reload: pm2 restart acap-tl-web
 */
module.exports = {
  apps: [
    {
      name: "acap-tl-web",
      cwd: __dirname,
      script: "./scripts/pm2-start-next.cjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        PORT: "43123",
        HOST: "0.0.0.0",
        // Must exceed worst-case Next boot (cold disk / AV scan).
        PM2_READY_TIMEOUT_MS: "180000",
      },
      autorestart: true,
      max_restarts: 50,
      min_uptime: "30s",
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      max_memory_restart: '1G',
      // Wrapper needs time to SIGTERM next, then taskkill the tree.
      kill_timeout: 20000,
      // Do not mark online until scripts/pm2-start-next.cjs process.send('ready').
      wait_ready: true,
      listen_timeout: 180000,
      shutdown_with_message: true,
    },
  ],
};
