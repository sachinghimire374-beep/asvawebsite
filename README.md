# Asva Innovation Lab — Website & CMS

Corporate website and content management system for **Asva Innovation Lab Pvt. Ltd.**, a software development company in Pokhara, Nepal.

| Part | Stack |
| --- | --- |
| Public website & admin CMS (`apps/web`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix/shadcn-style components, TanStack Query, React Hook Form, TipTap |
| API (`apps/api`) | NestJS 12 (ESM), REST under `/api/v1`, Swagger, Zod validation, pino logging |
| Database | PostgreSQL + Prisma 7 (migrations in `apps/api/prisma/migrations`) |
| Shared (`packages/shared`) | Zod schemas, permissions, roles, workflow rules, default content — used by both apps |

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · Security: [docs/SECURITY.md](docs/SECURITY.md)

---

## Quick start (local development)

Requirements: **Node.js 22.12+** (24 recommended), **PostgreSQL 15+** (local install or Docker).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    - set DATABASE_URL to your PostgreSQL database
#    - generate secrets (run three times, one per variable):
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#      → JWT_ACCESS_SECRET, TOKEN_HASH_SECRET, REVALIDATE_SECRET

#    Optional: start PostgreSQL + Mailpit (catches all emails) with Docker
docker compose up -d postgres mailpit
#      then use DATABASE_URL=postgresql://asva:asva-local-dev-password@localhost:5432/asva
#      and SMTP_HOST=localhost SMTP_PORT=1025 EMAIL_FROM="Asva <no-reply@localhost>"

# 3. Create the database schema and base data
npm run build:shared
npm run db:migrate:deploy
npm run db:seed            # roles, permissions, settings, navigation, legal templates, draft services

# 4. Create the first administrator (there are no default credentials)
npm run admin:create -- --email you@company.com --name "Your Name"

# 5. Run everything (shared watcher + API on :4000 + web on :3000)
npm run dev
```

- Website: http://localhost:3000 · Admin: http://localhost:3000/admin
- API docs (Swagger): http://localhost:4000/api/docs · Health: http://localhost:4000/api/v1/health/ready
- Mailpit (if used): http://localhost:8025

### Demo content (development only)

```bash
DEMO_USER_PASSWORD='Choose-A-Dev-Passw0rd!' npm run db:seed:demo
```

Publishes the suggested services, a set of technologies and FAQs, and adds a **clearly labelled sample** vacancy, plus one demo user per role (`admin@demo.asva.local`, `editor@…`, `sales@…`, `hr@…`). The script refuses to run when `NODE_ENV=production`.

---

## First administrator

`npm run admin:create -- --email <email> --name "<name>"` prompts for a password (hidden input) or reads `ADMIN_PASSWORD` for non-interactive use. It refuses to run once an administrator exists (use `--force` only for recovery). All further users are invited from **Admin → Users**; they receive a single-use link to set their own password. If SMTP is not configured, the admin UI shows the link so it can be shared securely.

## Roles

| Role | Can |
| --- | --- |
| Administrator | Everything, including users, roles, global settings and audit logs |
| Editor | Pages, services, categories, technologies, FAQs, testimonials, team, media, redirects |
| Sales Manager | Project inquiries (status, assignment, notes, CSV export), contact submissions, newsletter export |
| HR Manager | Job listings, applications, resume downloads |

Permissions are enforced by the API on every request (see `packages/shared/src/permissions.ts`). Role permissions can be adjusted in **Admin → Roles & permissions**.

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run shared watcher, API and web in watch mode |
| `npm run build` | Production build of all packages |
| `npm run lint` / `npm run typecheck` | Lint / type-check API and web |
| `npm run test:unit` | Unit tests (shared, API unit, web components) |
| `TEST_DATABASE_URL=… npm run test:integration -w @asva/api` | API integration tests against a **dedicated** database whose name contains `test` (it is wiped) |
| `npm test` | All of the above (needs `TEST_DATABASE_URL`) |
| `E2E_BASE_URL=http://localhost:3000 npm run test:e2e` | Playwright end-to-end tests against a running stack seeded with `db:seed:demo` |
| `npm run db:migrate` | Create a new migration during development (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Apply migrations (deployments, CI) |
| `npm run db:seed` / `db:seed:demo` / `db:sync-permissions` | Seed base data / demo data / sync new permission keys |
| `npm run admin:create` | Create the first administrator |
| `npm run audit:deps` | Audit production dependencies for known vulnerabilities |

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). Highlights:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`?sslmode=require` for managed databases) |
| `JWT_ACCESS_SECRET`, `TOKEN_HASH_SECRET` | ≥ 32 random characters each, different values, unique per environment |
| `FRONTEND_URL` | Public site URL — used for CORS, Origin checks and email links |
| `COOKIE_SECURE` | Defaults to `true` in production (required) |
| `SMTP_*`, `EMAIL_FROM` | Optional. Without them emails are stored as **SKIPPED** and a warning is logged |
| `STORAGE_PROVIDER` | `local` (dev / persistent volume) or `s3` (S3, R2, Spaces, MinIO) with `STORAGE_*` |
| `WEB_REVALIDATE_URL`, `REVALIDATE_SECRET` | Lets the API refresh the website cache immediately after CMS changes |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata and sitemap (safe to expose) |
| `API_INTERNAL_URL` | How the web server reaches the API (also baked into the `/api/v1` rewrite at build time) |
| `TURNSTILE_SECRET_KEY` | Optional Cloudflare Turnstile verification for public forms |

Never put secrets in `NEXT_PUBLIC_*` variables. `.env` files are git-ignored.

---

## How content flows

1. Editors change content in `/admin` → the API validates, sanitises, stores and audits it.
2. The API calls the web app's `/api/revalidate` with the affected cache tags.
3. The next visitor gets fresh content. If the webhook fails, cached data refreshes after `REVALIDATE_SECONDS` (default 5 minutes).

Scheduled posts are published by a server-side job every minute (never by the browser). Changing a published slug automatically creates a 308 redirect from the old URL.

## External services

| Service | Required? | Notes |
| --- | --- | --- |
| PostgreSQL | Yes | Managed service recommended in production |
| SMTP provider (e.g. Amazon SES, Postmark, Mailgun, Zoho, Gmail Workspace) | Recommended | Notifications, confirmations, password resets, invitations |
| S3-compatible object storage | Recommended in production | Media, resumes and attachments must survive redeploys |
| Google Analytics 4 / Tag Manager | Optional | IDs set in Admin → Settings → Analytics; loaded only after consent |
| Google Search Console | Optional | Verification code in Admin → Settings → SEO |
| Cloudflare Turnstile | Optional | Extra bot protection for public forms |
| Email-marketing tool | Optional | Export confirmed subscribers (with unsubscribe links) from Admin → Newsletter |

## Content still to be supplied by the company

The site deliberately does **not** invent facts. Before launch, fill in via the CMS:

- Contact email, phone, address, map, business hours, social profiles (**Settings → Contact / Social**)
- Which of the 12 suggested services are actually offered (publish them in **Services**)
- Which technologies the team really uses (**Technologies** — all hidden by default)
- Genuine, consented testimonials
- Legal review of the Privacy Policy, Terms and Cookie Policy templates (they carry a visible "legal review required" notice)
- Official logo files, if different from the built-in vector version (**Settings → Branding**)
- Notification recipients (**Settings → Notifications**)
