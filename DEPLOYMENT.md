# Deploying The Yonatan Times on Railway

One Railway web service serves **both** the Express API and the React site (same domain — admin cookies just work). Postgres is a Railway plugin.

---

## Before you start

Create these free-tier accounts:

| Service | Why |
|---|---|
| [Railway](https://railway.app) | API + site + Postgres |
| [Cloudinary](https://cloudinary.com) | Admin image uploads |
| [Resend](https://resend.com) | Contact form emails |
| [GitHub](https://github.com) | Source for auto-deploy |

Generate a session secret:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

---

## Step 1 — Push this repo

```powershell
cd d:\projects\yonatan-times
git remote -v
# Optional: point at a new GitHub repo named yonatan-times
# gh repo create yonatan-times --private --source=. --push
git push -u origin HEAD
```

---

## Step 2 — Create the Railway project

1. Open [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → pick `yonatan-times` (or this repo)
3. Railway detects [`railway.toml`](railway.toml) and builds from the repo root
4. In the project canvas: **+ New** → **Database** → **Add PostgreSQL**
5. Open the **web** service → **Variables** → add reference:
   `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   (Railway often injects this automatically when services are linked — confirm it exists)

---

## Step 3 — Environment variables

On the web service → **Variables**, set:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | the long random string you generated |
| `JWT_EXPIRES_IN` | `7d` |
| `ADMIN_EMAIL` | `yonatanberihun26@gmail.com` |
| `ADMIN_PASSWORD` | leave empty (generated once in logs) or 10+ chars |
| `ADMIN_NAME` | `Yonatan Berihun` |
| `PUBLIC_SITE_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `CORS_ORIGINS` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `RESEND_API_KEY` | from Resend |
| `RESEND_FROM_EMAIL` | `The Yonatan Times <onboarding@resend.dev>` |
| `CONTACT_NOTIFY_EMAIL` | where contact mail should go |
| `RUN_SEED` | `true` for the first deploy only |

Do **not** set `COOKIE_DOMAIN`.

---

## Step 4 — Public domain

1. Web service → **Settings** → **Networking** → **Generate Domain**
2. Copy the `*.up.railway.app` URL
3. Confirm `PUBLIC_SITE_URL` / `CORS_ORIGINS` resolve to that HTTPS URL
4. Update [`web/public/robots.txt`](web/public/robots.txt) Sitemap line to your real domain, commit, push

---

## Step 5 — First boot + seed

1. Watch **Deployments** → **Logs**
2. With `RUN_SEED=true` you should see `Seeding The Yonatan Times…`
3. If `ADMIN_PASSWORD` was empty, copy the one-time password block from logs
4. Open `https://YOUR-DOMAIN/health` → `{"ok":true,...}`
5. Open `https://YOUR-DOMAIN/` → the newspaper
6. **Remove or set `RUN_SEED` to empty** and redeploy so every restart does not re-seed

---

## Step 6 — Verify

- [ ] Home page loads
- [ ] Mobile menu works
- [ ] `/edition` lists the welcome article
- [ ] Contact form works; message appears in `/admin/inbox`
- [ ] `/admin` login works
- [ ] Media upload works (Cloudinary)
- [ ] Edit a project → refresh public site → change shows
- [ ] `/rss.xml` and `/sitemap.xml` redirect/return XML
- [ ] Change password under Settings

---

## Local development

```powershell
cd d:\projects\yonatan-times
npm run install:all
npm install --include=dev
cd server
copy .env.example .env   # fill DATABASE_URL + JWT_SECRET
npx prisma migrate dev
npm run seed
cd ..
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:4000 (Vite proxies `/api`)

---

## Troubleshooting

**Build fails on TypeScript**
Railway must install `devDependencies`. The root `build` script uses `npm install --include=dev` in each package.

**Admin login bounces**
You should be on the Railway domain only (not a separate frontend host). Clear cookies and try again.

**Empty site / “not set up yet”**
Set `RUN_SEED=true`, redeploy once, then clear it.

**Uploads fail**
Check the three `CLOUDINARY_*` variables.

**Contact saves but no email**
Inbox still works; fix `RESEND_API_KEY` / `CONTACT_NOTIFY_EMAIL`. Free Resend often only emails your own address until a domain is verified.
