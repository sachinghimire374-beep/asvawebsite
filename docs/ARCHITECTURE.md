# Architecture — Asva Innovation Lab website & CMS

## Overview

```
Browser ──► Next.js (apps/web)  ──rewrite /api/v1/* ──► NestJS API (apps/api) ──► PostgreSQL
               │  SSR/ISR fetches (API_INTERNAL_URL)        │
               │◄── on-demand revalidation webhook ─────────┤
                                                            ├──► Object storage (local disk in dev, S3-compatible in prod)
                                                            └──► SMTP (email outbox with retries)
```

* **npm workspaces monorepo**: `apps/web`, `apps/api`, `packages/shared`.
* `packages/shared` holds the single source of truth for Zod validation schemas, enums,
  permission keys, role definitions, lead-status transitions and reserved slugs. Both the
  API (request validation) and the web app (form validation) import it, so business rules
  are not duplicated.

## Frontend (apps/web)

* Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4 (design tokens in
  `app/globals.css`), shadcn/ui-style components built on Radix primitives (`components/ui`),
  Lucide icons, React Hook Form + Zod, TanStack Query (admin only), Sonner toasts, TipTap
  rich-text editor.
* `app/(public)` — server-rendered public site. Data is fetched from the API with
  `fetch(..., { next: { revalidate, tags } })`. The API calls `POST /api/revalidate` on the
  web app whenever content changes, so CMS edits show up on the site within seconds. A
  time-based revalidation acts as a fallback.
* `app/admin` — client-rendered CMS. The browser only talks to its own origin; Next.js
  rewrites `/api/v1/*` to the API, so auth cookies are first-party, `SameSite=Lax` and
  `HttpOnly`.
* `proxy.ts` redirects unauthenticated users away from `/admin` as a UX convenience only;
  **every permission check happens in the API**.

## Backend (apps/api)

NestJS (ESM), REST under `/api/v1`, Swagger at `/api/docs` (disabled in production unless
`SWAGGER_ENABLED=true`).

Modules: `auth`, `users`, `roles`, `audit`, `pages`, `services`, `technologies`,
`media`, `testimonials`, `faqs`, `team`, `inquiries`, `contact`, `careers`,
`newsletter`, `navigation`, `settings`, `redirects`, `dashboard`, `email`, `seo`, `health`,
`retention`, `revalidation`, `scheduler`, `common`, `prisma`, `config`.

Cross-cutting:

* Zod DTOs (from `@asva/shared`) validated by a global `ZodValidationPipe`, and documented in
  Swagger through `z.toJSONSchema`.
* Global `AuthGuard` (deny by default; `@Public()` opts out) → `PermissionsGuard`
  (`@RequirePermissions(...)`) → `CsrfGuard` (double-submit token on cookie-authenticated
  unsafe requests, plus an Origin check).
* `@nestjs/throttler` rate limits; stricter limits on login, password reset and public forms.
* Global exception filter → `{ error: { code, message, details? } }`; success responses are
  `{ data, meta? }`.
* Structured JSON logging with pino (`nestjs-pino`), request IDs, redaction of auth headers
  and cookies.
* `helmet`, strict CORS, body-size limits, `trust proxy`.

## Database

PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`). UUID primary keys, `createdAt`
and `updatedAt` on every table, unique slugs, foreign keys with explicit `onDelete`
behaviour, and indexes on status, date and foreign-key columns. Schema:
`apps/api/prisma/schema.prisma`.

Content tables use `ContentStatus` (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`) plus
`publishedAt`. Public queries always filter on `status = PUBLISHED AND publishedAt <= now()`.

## Authentication

* Argon2id password hashing, a strong-password policy, and the generic error "Invalid email
  or password".
* Short-lived access JWT (15 min, HS256, `jose`) in the `asva_at` HttpOnly cookie. An opaque
  refresh token (stored only as a SHA-256 hash) sits in the `asva_rt` cookie, scoped to
  `/api/v1/auth`.
* Refresh-token **rotation** with family tracking: reusing a rotated token revokes the whole
  family.
* Each request re-validates the session row, so logout and deactivation take effect
  immediately.
* Progressive lockout: after 5 failures the account locks for 15 min, doubling on each
  further failure (capped at 24 h). This is combined with per-IP throttling.
* Password reset and invitations use single-use, time-limited tokens (stored hashed).
  Accepting an invitation also verifies the email address.
* First admin: `npm run admin:create` (CLI). The system ships no default credentials.

## Authorization

Permission keys (e.g. `services.manage`, `inquiries.export`) are stored in the `Permission`
table and mapped to roles through `RolePermission`. Users can hold several roles. The
seeded roles are Administrator, Editor, Sales Manager and HR Manager (see
`packages/shared/src/permissions.ts`). Adding a permission means adding a key and running
`npm run db:sync-permissions`; the guard needs no changes.

## Media storage

The `StorageProvider` interface has two implementations: `local` (outside the web root, dev
only) and `s3` (any S3-compatible service: AWS S3, Cloudflare R2, DigitalOcean Spaces,
MinIO). Files are validated by magic bytes (`file-type`), extension allow-list and size.
SVG and executables are rejected. Resumes and inquiry attachments are stored with `PRIVATE`
visibility and can only be downloaded through permission-checked endpoints.

## Email

An outbox pattern: emails are written to `EmailMessage` and a scheduler sends them with
exponential back-off (max 5 attempts). If SMTP is not configured, messages are marked
`SKIPPED` and a warning is logged. The system never reports an email as sent when it was
not. Submissions are stored independently of email delivery.

## Background jobs

`@nestjs/schedule` cron jobs, each guarded by a PostgreSQL advisory lock so that multiple API
instances never run the same job twice:

* publish scheduled pages and services (every minute)
* email outbox delivery (every 30 s)
* data retention purge (daily)
* expired session/token cleanup (hourly)

## Deployment

* Web: any Node host for Next.js (Vercel, Render, Railway, a VPS with Docker).
* API: any Node host or container (Render, Railway, Fly.io, ECS, a VPS).
* DB: managed PostgreSQL.
* Media: S3-compatible bucket.

Migrations run as an explicit release step (`npm run db:migrate:deploy`) and never on app
startup. See `docs/DEPLOYMENT.md`.
