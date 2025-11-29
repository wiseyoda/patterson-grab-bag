# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo of small experiments and prototypes. Each project lives under `projects/<name>` with its own dependencies and tooling.

```
patterson-grab-bag/
├── projects/
│   └── secret-santa/     # Next.js 15 Secret Santa gift-exchange app
├── shared/               # Cross-project utilities (currently empty)
├── AGENTS.md             # Contribution and structure conventions
└── README.md
```

## Development Commands

All commands run from project directories (e.g., `cd projects/secret-santa`):

| Command | Description |
|---------|-------------|
| `make setup` | Install dependencies |
| `make fmt` | Format code (Prettier) |
| `make lint` | Run linter (ESLint) |
| `make test` | Run test suite (Jest) |
| `make run` | Start dev server |
| `make build` | Production build |

Single test file: `npm run test -- path/to/test.ts`

## Project: secret-santa

A Next.js 15 (App Router) application for organizing Secret Santa gift exchanges with blind administration (admin cannot see assignments).

### Tech Stack
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Database**: Prisma ORM with PostgreSQL (Vercel Postgres)
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Email**: Resend
- **Testing**: Jest + ts-jest

### Architecture

**Core lib modules** (`src/lib/`):
- `db.ts` - Prisma client singleton
- `derangement.ts` - Algorithm ensuring no self-assignments
- `email.ts` - Resend integration for notifications
- `env.ts` - Environment variable handling
- `logger.ts` - Error logging utility (writes to `error.log`)

**API Routes** (`src/app/api/`):
- `events/` - Create new events
- `admin/[adminToken]/` - Event management (CRUD, participants, randomize, notify)
- `reveal/[accessToken]/` - Participant assignment reveal

**Pages** (`src/app/`):
- `/` - Landing page (create event)
- `/admin/[adminToken]` - Admin dashboard
- `/reveal/[accessToken]` - Participant reveal page

**Key patterns**:
- GUID-based access: Admin and participant links use UUID tokens, no authentication required
- Blind administration: Admin endpoints never expose assignment mappings
- Event locking: Participant list locks after randomization

### Database Commands

```bash
npx prisma generate    # Generate client after schema changes
npx prisma db push     # Push schema to database
npx prisma studio      # Open database browser
```

### Environment Variables

Required in `.env.local`:
```
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."
RESEND_API_KEY="re_..."
NEXT_PUBLIC_APP_URL="https://..."
```

## Error Logging

Server-side errors are logged to `projects/secret-santa/error.log`. The log captures:
- Timestamp
- Error level (error, warn, info)
- Error message and context
- Stack traces for exceptions

**IMPORTANT**: When debugging or reviewing the app, always check the error log first:
```bash
cat projects/secret-santa/error.log
# or tail for recent errors:
tail -50 projects/secret-santa/error.log
```

Clear the log when needed:
```bash
> projects/secret-santa/error.log
```

## Code Style

- 2-space indentation for TypeScript/JavaScript
- Prettier + ESLint for formatting/linting
- kebab-case for directories, PascalCase for components, camelCase for functions
