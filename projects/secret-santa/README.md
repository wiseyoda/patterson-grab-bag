# Secret Santa

Next.js 16 app for running Secret Santa (grab bag) exchanges with GUID-based admin and participant links.

## Features
- Admin dashboard accessed via GUID (no accounts)
- Derangement-based assignments with lock-after-randomize flow
- Participant reveal links with viewed status tracking
- Optional email notifications (Resend)

## Stack
- Next.js 16 (App Router, TypeScript)
- Prisma with PostgreSQL
- Tailwind CSS + shadcn/ui + lucide-react
- Jest for tests, ESLint + Prettier for linting/formatting

## Layout
- `src/` — application code and UI
- `prisma/` — Prisma schema and generated client
- `public/` — static assets
- `tests/` — automated tests (see `docs/TESTING_PLAN.md` for coverage goals)
- `docs/` — specifications and implementation/testing plans

## Prereqs
- Node 20+ and npm
- PostgreSQL connection string
- Resend API key (for emails)

## Setup
1. Copy `.env.example` to `.env.local` and fill `PRISMA_DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`. With Vercel, you can keep envs in the dashboard and pull them locally with `vercel env pull .env.local`.
2. Install deps: `make setup`.
3. Verify DB connectivity (requires valid env): `make db-check`.
4. Apply migrations to your DB: `make db-migrate` (or `make db-migrate-dev` to create new migrations during development).
5. Seed sample data (optional): `make db-seed`.
6. Start dev server: `make run` (http://localhost:3000).

## Commands
- `make fmt` — Prettier (with Tailwind plugin)
- `make lint` — ESLint
- `make test` — Jest suite
- `make run` — Next dev server
- `make db-check` — Quick database connectivity probe
- `make db-migrate` — Apply existing Prisma migrations (deploy)
- `make db-migrate-dev` — Create/apply a new migration in dev (`MIGRATION_NAME=my-change make db-migrate-dev`)
- `make db-seed` — Seed sample data
- `make build` — `npm run build` (if you need production output)

Environment notes
- Runtime picks up `PRISMA_DATABASE_URL` (or `PRISMA_ACCELERATE_URL`/Vercel `POSTGRES_*` vars). For migrations, set `DIRECT_URL` (non-pooling Postgres URL, e.g., `POSTGRES_URL_NON_POOLING`).
- Keep secrets out of git; use Vercel envs and pull them locally with `vercel env pull`.

Additional docs live in `docs/`; start with `docs/SPECS.md` for the product overview.
