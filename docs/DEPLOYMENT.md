# Deployment guide

## Recommended architecture

```
                ┌──────────────────────┐     HTTPS      ┌────────────────────┐
 Visitors ───►  │  Web (Next.js)       │ ─────────────► │  API (NestJS)      │ ──► Managed PostgreSQL (private network)
                │  asvainnovationlab…  │  /api/v1/*     │  private or        │ ──► S3-compatible bucket (media)
                └──────────────────────┘  rewrite       │  api.… subdomain   │ ──► SMTP provider
                                                         └────────────────────┘
```

| Component | Good options |
| --- | --- |
| Web | Vercel, Render, Railway, Fly.io, or a VPS/container host (`apps/web/Dockerfile`, standalone output) |
| API | Render, Railway, Fly.io, AWS ECS/App Runner, DigitalOcean App Platform, or a VPS (`apps/api/Dockerfile`) |
| Database | Managed PostgreSQL (Neon, Supabase, AWS RDS, DigitalOcean, Render). **Not exposed publicly** — allow only the API's network/IPs |
| Media | Cloudflare R2, AWS S3, DigitalOcean Spaces, Backblaze B2 |
| Email | Amazon SES, Postmark, Mailgun, Brevo, or your domain's SMTP |

For a step-by-step Vercel setup of the web app, see [DEPLOYMENT-VERCEL.md](./DEPLOYMENT-VERCEL.md).

The browser only ever talks to the web origin; the web server proxies `/api/v1/*` to `API_INTERNAL_URL`. The API therefore does not need to be publicly reachable if both run on the same private network (it only needs to accept requests from the web server).

## Environments

Use separate **development**, **staging** and **production** environments, each with its own database, bucket, secrets and `FRONTEND_URL`. Never copy production secrets to staging. `robots.txt` blocks indexing unless `NODE_ENV=production` and `NEXT_PUBLIC_SITE_URL` contains neither `localhost` nor `staging`.

## Production checklist

1. **Provision** PostgreSQL, a bucket (private, with an optional CDN that exposes only the `public/` prefix) and SMTP credentials.
2. **Configure API environment** (see `.env.example`):
   - `NODE_ENV=production`, `DATABASE_URL` (with `sslmode=require`), `FRONTEND_URL=https://your-domain`
   - fresh `JWT_ACCESS_SECRET`, `TOKEN_HASH_SECRET`, `REVALIDATE_SECRET`
   - `STORAGE_PROVIDER=s3` and `STORAGE_*`; `SMTP_*`, `EMAIL_FROM`
   - `WEB_REVALIDATE_URL=https://your-domain/api/revalidate`
   - `TRUST_PROXY` = number of proxies/load balancers in front of the API
   - `SWAGGER_ENABLED=false` unless you protect `/api/docs` at the proxy
3. **Configure web environment**: `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL`, `REVALIDATE_SECRET` (same value as the API), optional `STORAGE_PUBLIC_URL`. `NEXT_PUBLIC_*` and `API_INTERNAL_URL` are read **at build time**, so rebuild after changing them.
4. **Release step — run migrations explicitly** (never on app start):
   ```bash
   npm run db:migrate:deploy        # or: docker run --rm --env-file api.env asva-api npx prisma migrate deploy
   npm run db:seed                  # first deploy only; idempotent and never overwrites edits
   ```
   Do **not** run `db:seed:demo` in production (it refuses to).
5. **Create the first administrator** once: `npm run admin:create -- --email … --name "…"` (or `docker run --rm -it --env-file api.env asva-api npx tsx scripts/create-admin.ts --email …`).
6. **Deploy** the API, then the web app. Health checks: `GET /api/v1/health/live` (process) and `/api/v1/health/ready` (database).
7. **HTTPS everywhere**; point your domain at the web app. HSTS is enabled automatically in production.
8. In the CMS: fill contact details, publish real services, set notification recipients, review legal pages, configure analytics if wanted.

### Scaling notes

- Background jobs (scheduled publishing, email outbox, retention) use PostgreSQL advisory locks, so running several API replicas is safe. Set `SCHEDULER_ENABLED=false` on replicas if you prefer a single worker.
- Rate limiting uses in-memory counters per instance. Behind multiple replicas, also apply rate limits at the load balancer/CDN (e.g. Cloudflare) or plug a Redis store into `@nestjs/throttler`.
- `local` storage is only suitable for a single server with a persistent volume. Container platforms with ephemeral disks **must** use `s3`.

## Docker (self-hosted)

```bash
cp .env.example .env    # set JWT_ACCESS_SECRET, TOKEN_HASH_SECRET, REVALIDATE_SECRET
docker compose --profile app up -d --build
docker compose --profile app run --rm api npx prisma migrate deploy
docker compose --profile app run --rm api npx tsx prisma/seed.ts
docker compose --profile app run --rm -it api npx tsx scripts/create-admin.ts --email you@company.com --name "You"
```

The compose file is tuned for local use (Mailpit for email, local media volume, ports bound to 127.0.0.1). For production, put a TLS reverse proxy (Caddy, Nginx, Traefik) in front of the `web` service and use managed PostgreSQL and S3 storage.

## Backups and restore

**Database** — managed providers offer automated daily backups and point-in-time recovery; enable them with ≥ 7-day retention. Additionally take periodic logical backups:

```bash
# backup (custom format, compressed)
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file=asva-$(date +%F).dump

# restore into an EMPTY database
pg_restore --no-owner --clean --if-exists --dbname="$RESTORE_DATABASE_URL" asva-2026-10-27.dump
```

Store dumps encrypted and off-site (e.g. a separate bucket with versioning and lifecycle rules). They contain personal data — restrict access accordingly.

**Media** — enable bucket versioning and replicate/copy the bucket periodically (`rclone sync` or provider replication). For `local` storage, back up the `storage/` volume together with the database dump (the database references object keys).

**Test restores** at least quarterly: restore into a staging database, point a staging API at it, and verify login and a few pages.

## Data retention

The API purges, daily at 03:00 server time: archived contact messages after `RETENTION_CONTACT_DAYS` (730), archived/lost leads after `RETENTION_INQUIRY_DAYS` (1095), rejected/withdrawn applications (and their resumes) after `RETENTION_APPLICATION_DAYS` (365), audit logs after `RETENTION_AUDIT_DAYS` (730) and delivered email records after `RETENTION_EMAIL_DAYS` (90). Align these with your privacy policy and legal advice.

## Domain & SEO

- Set `NEXT_PUBLIC_SITE_URL` to the canonical domain (with or without `www`, choose one and redirect the other at DNS/proxy level).
- Submit `https://your-domain/sitemap.xml` in Google Search Console; add the verification code in Admin → Settings → SEO.
