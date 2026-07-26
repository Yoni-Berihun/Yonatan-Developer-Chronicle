# Deploying The Yonatan Times on Vercel

The repository deploys as two Vercel projects:

- `server/` — Express API as a Vercel Node.js function
- `web/` — Vite/React frontend

The API needs an external PostgreSQL database. A pooled Neon database from the
Vercel Marketplace is a good default. Images are stored in Cloudinary, not on
Vercel's temporary filesystem.

## 1. Prepare accounts and secrets

Create accounts for Vercel, Neon, and Cloudinary. Resend is optional but needed
for contact-form notification emails.

Generate a session secret in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

## 2. Deploy the backend first

In Vercel, import this repository as a new project with:

- Project name: `yonatan-times-api`
- Root Directory: `server`
- Framework Preset: Other
- Build and install settings: leave them as configured in `server/vercel.json`

Add these environment variables before deploying:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Pooled PostgreSQL URL, including `sslmode=require` |
| `DIRECT_URL` | Non-pooled PostgreSQL URL used for migrations |
| `JWT_SECRET` | The generated secret (at least 32 characters) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Initial password (at least 10 characters) |
| `ADMIN_NAME` | Admin display name |
| `PUBLIC_SITE_URL` | Temporary frontend URL, then update after step 3 |
| `CORS_ORIGINS` | Same value as `PUBLIC_SITE_URL` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard value |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard value |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard value |
| `RESEND_API_KEY` | Optional Resend API key |
| `RESEND_FROM_EMAIL` | Optional verified sender |
| `CONTACT_NOTIFY_EMAIL` | Optional notification recipient |

`npm run vercel-build` generates Prisma, applies committed migrations, and
typechecks the server. Use a separate database for preview deployments, or
disable preview deployments for the API, so previews cannot migrate production.

After deployment, verify:

```text
https://yonatan-times-api.vercel.app/health
```

If Vercel assigns another hostname, replace `yonatan-times-api.vercel.app` in
`web/vercel.json` before deploying the frontend.

## 3. Import the initial content

Run this once from PowerShell with the production database URLs:

```powershell
cd server
$env:DATABASE_URL="<production database url>"
$env:DIRECT_URL="<production direct database url>"
npm run seed
Remove-Item Env:DATABASE_URL
Remove-Item Env:DIRECT_URL
```

The seed is idempotent and can safely be run again.

## 4. Deploy the frontend

Import the repository again as a second Vercel project with:

- Project name: `yonatan-times`
- Root Directory: `web`
- Framework Preset: Vite
- Build and install settings: leave them as configured in `web/vercel.json`

Set:

| Variable | Value |
|---|---|
| `PRERENDER_API_URL` | Backend production URL, without a trailing slash |
| `PUBLIC_SITE_URL` | Frontend production URL, without a trailing slash |

The rewrites in `web/vercel.json` proxy API requests through the frontend
domain. This is required for reliable first-party admin session cookies.

## 5. Connect publishing and final URLs

1. In the frontend project, create a production Deploy Hook named
   `content-publish`.
2. Add its URL to the backend as `VERCEL_DEPLOY_HOOK_URL`.
3. Update backend `PUBLIC_SITE_URL` and `CORS_ORIGINS` to the real frontend URL.
4. Update the `Sitemap:` URL in `web/public/robots.txt`.
5. Redeploy both projects after changing environment variables.

## 6. Verify

- `/health` on the backend returns `{ "ok": true, ... }`
- The home page and `/edition` load database content
- `/admin` login persists after refresh
- Contact submissions appear in `/admin/inbox`
- Image upload works (maximum 4 MB per image on Vercel)
- `/rss.xml` and `/sitemap.xml` return XML
- Publishing content triggers a frontend deployment

## Notes

- Vercel functions have a temporary filesystem; keep all uploads in Cloudinary.
- Use a pooled PostgreSQL URL to avoid exhausting database connections.
- The existing in-memory login/contact rate limits are best-effort across
  serverless instances. Use a shared Redis-based limiter if traffic grows.
