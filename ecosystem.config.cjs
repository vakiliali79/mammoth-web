/**
 * PM2 process definition for MAMMOTH CAFE.
 * Isolated from any other app on the server: its own name, port and cwd.
 * Secrets are NOT stored here — Next.js loads them from ./.env at start.
 *
 *   pm2 start ecosystem.config.cjs && pm2 save
 */
module.exports = {
  apps: [
    {
      name: "mammoth-cafe",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100 -H 127.0.0.1",
      // One process: the JSON data store and login rate-limiter are per-process.
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      autorestart: true,
      time: true,
    },
  ],
};
