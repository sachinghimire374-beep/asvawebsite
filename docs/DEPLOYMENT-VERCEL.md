# Deploying the website to Vercel

Vercel hosts **`apps/web` only**. This repository is three pieces:

| Piece | Where it runs |
| --- | --- |
| `apps/web` — Next.js public site + admin UI | **Vercel** |
| `apps/api` — NestJS API, Prisma, jobs, email, media | Render / Railway / Fly.io / VPS (`apps/api/Dockerfile`) |
| PostgreSQL | Neon / Supabase / Render / RDS |

The site builds fine without the API, but every public page fetches data at
request time, so **deploy the API and database first** or the live site will
return errors.

---

## 1. Database

Create a managed PostgreSQL instance and keep the connection string:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/asva?schema=public&sslmode=require
```

Do not expose it publicly — allow only the API's network/IPs.

## 2. API

Deploy `apps/api` (see [DEPLOYMENT.md](./DEPLOYMENT.md) for the full variable
list). The values that must line up with Vercel are:

```
NODE_ENV=production
DATABASE_URL=...
FRONTEND_URL=https://www.your-domain.com         # the Vercel domain
WEB_REVALIDATE_URL=https://www.your-domain.com/api/revalidate
REVALIDATE_SECRET=<random, identical on Vercel>
JWT_ACCESS_SECRET=<64 random bytes>
TOKEN_HASH_SECRET=<64 random bytes, different>
COOKIE_SECURE=true
TRUST_PROXY=1
STORAGE_PROVIDER=s3                              # local disk does not persist
```

Generate each secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Then run migrations and create the first admin:

```bash
npm run db:migrate:deploy
npm run admin:create
```

Note the API's public URL, e.g. `https://asva-api.onrender.com`.

## 3. Vercel project

Import the repository, then set **Settings → Build & Deployment**:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Include files outside the Root Directory | **enabled** (needed for `packages/shared`) |
| Node.js Version | 22.x or newer (`engines` requires >= 22.12) |

Everything else is already committed in [`apps/web/vercel.json`](../apps/web/vercel.json):
the install command installs the whole npm workspace and the build command
builds `@asva/shared` before `next build`. Both work whether Vercel runs them
from the monorepo root or from `apps/web`, so leave the dashboard's Install and
Build Command fields empty — a dashboard override wins over `vercel.json`.

Optionally set **Settings → Functions → Region** to the region closest to your
API, so server-rendered pages are not a continent away from their data.

`apps/web/next.config.ts` skips `output: 'standalone'` on Vercel (that mode is
for the Docker/VPS path) and **fails the production build** if
`API_INTERNAL_URL`, `NEXT_PUBLIC_SITE_URL` or `REVALIDATE_SECRET` is missing, so
a misconfigured project never goes live.

## 4. Environment variables on Vercel

Add these for **Production** and **Preview**:

| Variable | Value |
| --- | --- |
| `API_INTERNAL_URL` | Public API URL, no trailing slash |
| `NEXT_PUBLIC_SITE_URL` | `https://www.your-domain.com` (the canonical URL) |
| `REVALIDATE_SECRET` | Same value as on the API |
| `REVALIDATE_SECONDS` | `300` |
| `STORAGE_PUBLIC_URL` | R2/S3/CDN public base URL, if media is served from one |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key, if spam protection is on |

Notes:

- `API_INTERNAL_URL` and `STORAGE_PUBLIC_URL` are read at **build time** (the
  `/api/v1/*` rewrite and the allowed image hosts), so changing either needs a
  redeploy, not just a restart.
- Never put a secret in a `NEXT_PUBLIC_*` variable — those are sent to browsers.
- Preview deployments get their own URLs. Either point them at a staging API, or
  add the preview domain to `CORS_ORIGINS` on the API.

## 5. Domain and finishing up

1. Add the domain in Vercel → **Domains** and point DNS at it.
2. Update `FRONTEND_URL` and `WEB_REVALIDATE_URL` on the API to that domain and
   redeploy the API.
3. If the API runs on a subdomain of the same parent domain, set
   `COOKIE_DOMAIN=.your-domain.com` on the API. Otherwise leave it empty —
   browser traffic goes to `/api/v1/*` on the web origin and is proxied, so auth
   cookies stay first-party either way.

## 6. Verify

- Public pages render real CMS content (not the fallback/empty state).
- `/admin` login works and sets a session cookie.
- Editing content in the admin updates the public page within seconds — that
  proves `WEB_REVALIDATE_URL` + `REVALIDATE_SECRET` are wired correctly.
- `/sitemap.xml` and `/robots.txt` show the production domain.
- `/admin` responds with `X-Robots-Tag: noindex, nofollow`.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Build fails with "Missing required environment variables" | Add the listed variables to the Production environment and redeploy |
| `Cannot find module '@asva/shared'` | "Include files outside the Root Directory" is off, or the build command was overridden in the dashboard |
| Every public page errors, logs show `API unreachable` | `API_INTERNAL_URL` wrong/unset, or the API blocks Vercel's egress |
| Admin login returns 401 immediately | `FRONTEND_URL` on the API does not match the Vercel domain (Origin/CSRF check) |
| CMS edits do not appear until `REVALIDATE_SECONDS` elapses | `REVALIDATE_SECRET` differs between API and web |
| `next/image` 400s on media | `STORAGE_PUBLIC_URL` not set on the web project |

The `cf:build` / `cf:deploy` scripts in `apps/web/package.json` are a separate
Cloudflare Workers path — they are not used by Vercel.
