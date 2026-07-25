# Deploying The Yonatan Times

Two services: the **API and database on Render**, the **React site on Vercel**. Work through this in order — the Vercel step needs the Render URL, and the seed step needs both.

Expected running cost: **$13.30/month** on Render. Vercel, Cloudinary and Resend stay inside their free tiers.

---

## Before you start

Create these accounts. All three have free tiers that are genuinely sufficient here.

| Service | Why | Free tier |
|---|---|---|
| [Cloudinary](https://cloudinary.com) | Image uploads from the admin panel | 25 GB storage and bandwidth |
| [Resend](https://resend.com) | Contact form notification emails | 3,000 emails/month |
| [Vercel](https://vercel.com) | Hosting the React site | Generous for personal projects |

Also generate a session secret and keep it somewhere safe:

```bash
openssl rand -base64 48
```

No `openssl`? In PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

---

## Step 1 — Push the branch

```bash
git push -u origin feat/dynamic-portfolio
```

Deploy from this branch first and merge to `main` once you have confirmed it works.

---

## Step 2 — Create the Render services

1. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint**
2. Connect this repository and select the `feat/dynamic-portfolio` branch
3. Render reads `render.yaml` and offers to create two resources:
   - `yonatan-times-api` — a Starter web service ($7/month)
   - `yonatan-times-db` — a `basic-256mb` PostgreSQL database ($6/month plus $0.30/GB)
4. Click **Apply**

`DATABASE_URL` and `JWT_SECRET` are wired up automatically. The first deploy will fail to finish starting, which is expected — the remaining environment variables are not set yet.

> **Check the service URL.** If the name `yonatan-times-api` is already taken globally, Render appends a suffix. Note the real URL from the dashboard — you need it in step 4.

### Confirm your credit is being used

Go to **Billing** and check that your $100 credit is applied and note its **expiry date**. Promotional credits usually expire on a fixed date rather than when they run out.

---

## Step 3 — Set the remaining environment variables

In the Render dashboard, open `yonatan-times-api` → **Environment**, then add:

| Key | Value |
|---|---|
| `ADMIN_EMAIL` | `yonatanberihun26@gmail.com` |
| `ADMIN_PASSWORD` | *Leave empty* — one is generated and logged once. Or set your own (10+ characters). |
| `ADMIN_NAME` | `Yonatan Berihun` |
| `PUBLIC_SITE_URL` | Your Vercel URL. Set a placeholder now, correct it after step 4. |
| `CORS_ORIGINS` | Same as `PUBLIC_SITE_URL` |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |
| `RESEND_API_KEY` | From Resend → API Keys |
| `RESEND_FROM_EMAIL` | `The Yonatan Times <onboarding@resend.dev>` |
| `CONTACT_NOTIFY_EMAIL` | Where contact messages should land |

Save. Render redeploys automatically.

When it comes up, check the logs. If you left `ADMIN_PASSWORD` empty you will see a block like this **exactly once**:

```
======================================================================
  An admin account was created because none existed.
  Email:    yonatanberihun26@gmail.com
  Password: kJ3n-xQ8mR2pL9vT
  Save this now — it will not be shown again.
======================================================================
```

**Copy that password before you do anything else.**

Then confirm the API is alive:

```
https://yonatan-times-api.onrender.com/health
```

You should see `{"ok":true,...}`.

---

## Step 4 — Import your existing content

The database has tables but no content yet. Run the seed once from your machine, pointing at production.

Copy the **External Database URL** from the Render database page, then:

```bash
cd server
# PowerShell
$env:DATABASE_URL="<external database url from Render>"
npm run seed
```

```bash
# macOS / Linux
DATABASE_URL="<external database url from Render>" npm run seed
```

This imports every project, skill, timeline entry, award, social link and setting from the original `index.html`, plus a short welcome article. It is safe to run more than once — everything is keyed on a stable slug, so re-running refreshes the baseline rather than duplicating it.

---

## Step 5 — Deploy the site to Vercel

1. **New Project** → import this repository
2. Set **Root Directory** to `web` — this matters, the build will fail without it
3. Framework preset should detect **Vite** automatically
4. Add one environment variable:

| Key | Value |
|---|---|
| `PRERENDER_API_URL` | `https://yonatan-times-api.onrender.com` |
| `PUBLIC_SITE_URL` | Your Vercel production URL |

5. **Deploy**

`PRERENDER_API_URL` lets the build fetch your content and bake real titles and share images into the HTML. Without it the site still works, but shared links fall back to a generic title.

### Point the proxy at your API

Open `web/vercel.json` and replace `yonatan-times-api.onrender.com` with your actual Render host in all three rewrites:

```json
{
  "source": "/api/:path*",
  "destination": "https://YOUR-API-HOST.onrender.com/api/:path*"
}
```

Commit and push. This rewrite is what keeps the admin login working — it makes the API same-origin so the session cookie is first-party.

---

## Step 6 — Close the loop

Now that you have the real Vercel URL:

1. Back in Render, correct `PUBLIC_SITE_URL` and `CORS_ORIGINS`
2. Update the `Sitemap:` line in `web/public/robots.txt` to your domain
3. In Vercel, go to **Settings → Git → Deploy Hooks**, create a hook named `content-publish` on your production branch, and copy the URL
4. Add it in Render as `VERCEL_DEPLOY_HOOK_URL`

That last one means publishing an article automatically rebuilds the site so the new piece is immediately shareable and indexable.

---

## Step 7 — Verify

Work down this list:

- [ ] The home page looks identical to the original static site
- [ ] The mobile menu opens, closes on Escape, and closes when a link is tapped
- [ ] The awards carousel advances with the arrows and the dots
- [ ] `/edition` lists the welcome article
- [ ] The contact form sends, and the message appears in `/admin/inbox`
- [ ] `/admin` login works with your credentials
- [ ] Uploading an image in `/admin/media` succeeds
- [ ] Editing a project appears on the public page after a refresh
- [ ] `/rss.xml` and `/sitemap.xml` return XML
- [ ] Pasting an article link into Telegram or LinkedIn shows the right title and image

Then **change your password** under `/admin` → Settings.

---

## Step 8 — Custom domain (recommended)

A real domain makes the portfolio noticeably more credible to a recruiter, and it removes the `.vercel.app` in shared links. Add it in **Vercel → Settings → Domains**, then update `PUBLIC_SITE_URL`, `CORS_ORIGINS` and `robots.txt`.

---

## Troubleshooting

**The admin login succeeds but immediately bounces back to the login screen.**
The session cookie is not sticking, which almost always means the `/api` rewrite in `web/vercel.json` still points at the wrong host. Open the browser network tab: requests to `/api/auth/me` should go to your own domain, not to `onrender.com`.

**The site loads but shows "Stop the press".**
The API is unreachable or the database is empty. Check `/health` on your Render URL, then confirm you ran the seed in step 4.

**Uploads fail with "Image uploads are not configured".**
One of the three `CLOUDINARY_*` variables is missing or misspelled in Render.

**The contact form works but no email arrives.**
Messages are saved to the database first and emailed second by design, so check `/admin/inbox` — if the message is there, the problem is only `RESEND_API_KEY` or `CONTACT_NOTIFY_EMAIL`. On Resend's free tier without a verified domain you can only send to your own address.

**A migration fails on deploy and the service will not start.**
That is deliberate — starting with a mismatched schema would corrupt data. Read the Render log for the Prisma error, fix the migration locally, and push again.

**Everything was fine, now the first request each morning is slow.**
That would mean the service is on the Free instance type rather than Starter. Starter instances do not spin down. Check the plan on the Render service page.

---

## What to keep an eye on

| Thing | Where | Why |
|---|---|---|
| Credit balance and expiry | Render → Billing | Promo credits expire on a date, not on use |
| Database size | Render → your database | You are paying for 1 GB; text content will not come close |
| Cloudinary usage | Cloudinary dashboard | 25 GB is a lot of screenshots, but worth a glance |
| Backups | Render → your database | Basic instances include daily backups; confirm they are on |
