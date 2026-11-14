#!/usr/bin/env bash
# Update an existing MAMMOTH CAFE deployment in place (run on the server, inside the project dir).
#   ./scripts/deploy.sh            → pull, install, build, reload
# Only the "mammoth-cafe" PM2 process is touched.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "✗ .env is missing. Copy .env.example and run: npm run admin:setup"; exit 1; }

echo "→ Recording current commit for rollback"
git rev-parse HEAD > .last-deploy
echo "→ Pulling"
git pull --ff-only
echo "→ Installing dependencies"
npm ci
echo "→ Building"
npm run build
echo "→ Reloading PM2 process 'mammoth-cafe'"
if pm2 describe mammoth-cafe > /dev/null 2>&1; then
  pm2 reload mammoth-cafe --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save
echo "✓ Deployed $(git rev-parse --short HEAD). Roll back with: git checkout \$(cat .last-deploy) && npm ci && npm run build && pm2 reload mammoth-cafe"
