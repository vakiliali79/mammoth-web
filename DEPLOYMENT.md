# Deployment — MAMMOTH CAFE on a Linux VPS

This deploys the site **alongside** an application that already runs on the server, without
touching it. Mammoth Cafe gets its own directory, Node process, port, environment file, PM2
entry and Nginx server block.

> Nothing in this repository has been run against your server. Every step below is something
> you (or an operator you authorise) run deliberately.

| Isolated resource | Value used in this guide |
| --- | --- |
| Project directory | `/var/www/mammoth-cafe` |
| Data directory (menu + uploads) | `/var/lib/mammoth-cafe` |
| Port (localhost only) | `3100` |
| PM2 process name | `mammoth-cafe` |
| Nginx config | `/etc/nginx/sites-available/mammoth-cafe` (new file) |

## 0. Inspect the server first (read-only)

Run these before changing anything, and keep the output:

```bash
pm2 list                              # existing processes and their names
sudo ss -ltnp | grep -E ':(80|443|3[0-9]{3})\b'   # which ports are taken
ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/    # existing sites
sudo nginx -T | grep -E 'server_name|listen|proxy_pass'
node -v                               # needs ≥ 20.9
df -h / && free -m
```

Check that:

- **port 3100 is free** — if not, pick another and change it in `ecosystem.config.cjs`
  (`args`) *and* the Nginx `upstream`;
- no existing PM2 process is called `mammoth-cafe`;
- no existing Nginx server block uses your cafe domain;
- the other app does not rely on a global Node version older than 20.9. If it does, install a
  second Node with `nvm` for this project only rather than upgrading the system Node.

## 1. Get the code

```bash
sudo mkdir -p /var/www/mammoth-cafe /var/lib/mammoth-cafe
sudo chown -R $USER:$USER /var/www/mammoth-cafe /var/lib/mammoth-cafe
git clone <your-repository-url> /var/www/mammoth-cafe
cd /var/www/mammoth-cafe
npm ci
```

## 2. Configure

```bash
cp .env.example .env
nano .env
```

Set:

```ini
SITE_URL=https://your-domain.ir
PORT=3100
DATA_DIR=/var/lib/mammoth-cafe
COOKIE_SECURE=true
```

Then create the admin login (writes the password **hash** and a session secret to `.env`):

```bash
npm run admin:setup
chmod 600 .env
```

`.env` is read by Next.js at start-up. It is git-ignored; never commit or share it.

## 3. Build and start (PM2)

```bash
npm run build
pm2 start ecosystem.config.cjs      # starts ONLY "mammoth-cafe"
pm2 save
curl -I http://127.0.0.1:3100/      # expect HTTP/1.1 200
```

If PM2 is not yet set to start on boot: `pm2 startup` (prints one command to run). If it is
already configured for the other app, `pm2 save` is all that is needed.

The process binds to `127.0.0.1`, so it is reachable only through Nginx.

## 4. Nginx (new server block — existing configs untouched)

```bash
sudo cp deploy/nginx-mammoth-cafe.conf.example /etc/nginx/sites-available/mammoth-cafe
sudo nano /etc/nginx/sites-available/mammoth-cafe     # set server_name
sudo ln -s /etc/nginx/sites-available/mammoth-cafe /etc/nginx/sites-enabled/mammoth-cafe
sudo nginx -t                # MUST pass before reloading
sudo systemctl reload nginx  # reload, not restart: the other site keeps serving
```

If `nginx -t` fails, remove the symlink and nothing has changed for the other site:
`sudo rm /etc/nginx/sites-enabled/mammoth-cafe`.

(If your server uses `/etc/nginx/conf.d/` instead of `sites-enabled`, copy the file to
`/etc/nginx/conf.d/mammoth-cafe.conf`.)

## 5. SSL (Let's Encrypt)

Point the domain's A/AAAA record at the server, then:

```bash
sudo apt install certbot python3-certbot-nginx     # if not installed
sudo certbot --nginx -d your-domain.ir -d www.your-domain.ir
sudo certbot renew --dry-run
```

Certbot edits only the server block whose `server_name` matches. Afterwards confirm
`SITE_URL` in `.env` starts with `https://` and `COOKIE_SECURE=true`, then
`pm2 reload mammoth-cafe --update-env`.

Until SSL works, the admin login needs `COOKIE_SECURE=false` (browsers drop secure cookies
on plain HTTP). Set it back to `true` as soon as HTTPS is live.

## 6. Verify

```bash
curl -sI https://your-domain.ir/ | head -1          # 200
curl -s https://your-domain.ir/robots.txt
curl -s https://your-domain.ir/sitemap.xml | head
pm2 logs mammoth-cafe --lines 30
```

Then in a browser: scroll the homepage animation, open `/menu`, log in at `/admin`, upload
one image. Confirm the other application still responds.

## 7. Updating

```bash
cd /var/www/mammoth-cafe
./scripts/deploy.sh
```

This records the current commit in `.last-deploy`, pulls, runs `npm ci`, builds and does a
`pm2 reload mammoth-cafe`. Menu data and uploads live in `DATA_DIR` and are not affected.

Because the build replaces `.next/` in place, there are a few seconds during `npm run build`
+ reload where a request can fail. For a cafe site this is normally acceptable; deploy at a
quiet time.

## 8. Rollback

```bash
cd /var/www/mammoth-cafe
git checkout "$(cat .last-deploy)"     # or any known-good commit/tag
npm ci && npm run build
pm2 reload mammoth-cafe
```

Data rollback (only if content was damaged): restore a backup of `/var/lib/mammoth-cafe`
(see ADMIN_GUIDE.md § Backups) and reload.

To remove the site completely without affecting anything else:

```bash
pm2 delete mammoth-cafe && pm2 save
sudo rm /etc/nginx/sites-enabled/mammoth-cafe && sudo nginx -t && sudo systemctl reload nginx
```

## 9. Operations

| Task | Command |
| --- | --- |
| Logs | `pm2 logs mammoth-cafe` |
| Status / memory | `pm2 status`, `pm2 monit` |
| Restart | `pm2 reload mammoth-cafe` |
| Change admin password | `npm run admin:setup && pm2 reload mammoth-cafe --update-env` |
| Backup content | `tar czf ~/mammoth-data-$(date +%F).tar.gz -C /var/lib/mammoth-cafe .` |

Suggested cron for a nightly backup (keeps 14 days):

```cron
30 3 * * * tar czf /var/backups/mammoth-$(date +\%F).tar.gz -C /var/lib/mammoth-cafe . && find /var/backups -name 'mammoth-*.tar.gz' -mtime +14 -delete
```

## Notes and limits

- **Single process.** The JSON store serialises writes inside one Node process and the login
  rate-limiter is in memory. Keep `instances: 1`. If you ever need several instances, move to
  PostgreSQL first (PROJECT_ARCHITECTURE.md).
- **Memory.** The app idles around 100–150 MB; `max_memory_restart` is 400 MB. Building needs
  roughly 1 GB free — on a very small VPS, add swap or build elsewhere and copy `.next/`.
- **Fonts and scripts are self-hosted**; visitors make no requests to Google or other CDNs.
  The only third-party request is the optional OpenStreetMap embed in the contact section.
