# Implementation Plan - Secret Santa Gift Exchange

## Phase 1: Project Setup

### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 1.2 Install Dependencies
```bash
# Database
npm install prisma @prisma/client

# UI Components
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react

# Email
npm install resend

# Utilities
npm install uuid
npm install -D @types/uuid
```

### 1.3 Initialize Prisma
```bash
npx prisma init
```

### 1.4 Setup shadcn/ui
```bash
npx shadcn@latest init
npx shadcn@latest add button card input label textarea badge table dialog alert
```

---

## Phase 2: Database Schema

### 2.1 Create Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("PRISMA_DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum NotificationStatus {
  NOT_SENT
  SENT
  VIEWED
}

model Event {
  id          String   @id @default(uuid())
  name        String
  adminToken  String   @unique @default(uuid())
  budget      String?
  eventDate   DateTime?
  rules       String?  @db.Text
  isLocked    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  participants Participant[]
}

model Participant {
  id                 String             @id @default(uuid())
  eventId            String
  name               String
  email              String?
  accessToken        String             @unique @default(uuid())
  assignedToId       String?
  notificationStatus NotificationStatus @default(NOT_SENT)
  notifiedAt         DateTime?
  viewedAt           DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  event      Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  assignedTo Participant? @relation("Assignment", fields: [assignedToId], references: [id])
  assignedBy Participant? @relation("Assignment")

  @@index([eventId])
  @@index([accessToken])
}
```

### 2.2 Generate and Migrate
```bash
npx prisma generate
npx prisma db push
```

---

## Phase 3: Core Business Logic

### 3.1 Derangement Algorithm (`src/lib/derangement.ts`)
- Implement Fisher-Yates shuffle variant that guarantees no self-assignments
- Algorithm: Shuffle array, then swap any element that maps to itself

### 3.2 Database Client (`src/lib/db.ts`)
- Singleton Prisma client for serverless

### 3.3 Email Service (`src/lib/email.ts`)
- Resend integration for sending notification emails
- Email template with event details and reveal link

---

## Phase 4: API Routes

### 4.1 Event Creation (`src/app/api/events/route.ts`)
- POST: Create event, return adminToken

### 4.2 Admin Routes (`src/app/api/admin/[adminToken]/route.ts`)
- GET: Get event details with participants (no assignments!)
- PUT: Update event settings (if not locked)
- DELETE: Delete event

### 4.3 Participant Management
- `src/app/api/admin/[adminToken]/participants/route.ts`
  - POST: Add participant (if not locked)
- `src/app/api/admin/[adminToken]/participants/[participantId]/route.ts`
  - DELETE: Remove participant (if not locked)

### 4.4 Assignment & Notification
- `src/app/api/admin/[adminToken]/randomize/route.ts`
  - POST: Run derangement, save assignments, lock event
- `src/app/api/admin/[adminToken]/notify/route.ts`
  - POST: Send emails to all participants with email addresses
- `src/app/api/admin/[adminToken]/resend/[participantId]/route.ts`
  - POST: Resend email to specific participant

### 4.5 Reveal Route (`src/app/api/reveal/[accessToken]/route.ts`)
- GET: Return assigned person's name + event details, mark as viewed

---

## Phase 5: Frontend Pages

### 5.1 Landing Page (`src/app/page.tsx`)
- Event creation form
- Fields: name, eventDate, budget, rules
- On success: redirect to admin page with adminToken

### 5.2 Admin Dashboard (`src/app/admin/[adminToken]/page.tsx`)
- Event details summary
- Participant list with status indicators
- Add participant form (if not locked)
- "Randomize" button (if not locked and >= 3 participants)
- "Send All Emails" button (if locked)
- Per-participant actions:
  - Copy link to clipboard
  - Send/Resend email (if has email)
  - Status badge (Not Sent / Sent / Viewed)

### 5.3 Reveal Page (`src/app/reveal/[accessToken]/page.tsx`)
- Fetch assignment on load
- Display: "You're buying a gift for: **[Name]**"
- Display: Event name, date, budget, rules
- Mobile-optimized, festive design

---

## Phase 6: UI Components

### 6.1 Components to Build
- `EventForm` - Create event form
- `ParticipantList` - Table of participants with actions
- `AddParticipantForm` - Add new participant
- `ParticipantRow` - Single participant with actions
- `StatusBadge` - Visual status indicator
- `RevealCard` - Assignment reveal with animation

---

## Phase 7: Polish & Security

### 7.1 Rate Limiting
- Simple in-memory rate limiter for MVP
- Track requests per adminToken/accessToken

### 7.2 Error Handling
- Consistent error responses
- User-friendly error messages

### 7.3 Loading States
- Skeleton loaders
- Button loading states

### 7.4 Responsive Design
- Mobile-first approach
- Touch-friendly buttons

---

## Implementation Order

| Step | Task | Est. Files |
|------|------|------------|
| 1 | Project setup + dependencies | 3 |
| 2 | Prisma schema + client | 2 |
| 3 | Derangement algorithm | 1 |
| 4 | Email service | 1 |
| 5 | API: Create event | 1 |
| 6 | API: Admin CRUD | 3 |
| 7 | API: Participants | 2 |
| 8 | API: Randomize | 1 |
| 9 | API: Notify/Resend | 2 |
| 10 | API: Reveal | 1 |
| 11 | Page: Landing | 1 |
| 12 | Page: Admin dashboard | 1 |
| 13 | Page: Reveal | 1 |
| 14 | UI Components | 6 |
| 15 | Polish + testing | - |

**Total: ~26 files**

---

## Environment Variables Required

```env
# Database (Vercel Postgres)
PRISMA_DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

# Email (Resend)
RESEND_API_KEY="re_..."

# App
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

---

## Deployment Checklist

1. [ ] Create Vercel project
2. [ ] Add Vercel Postgres database
3. [ ] Configure environment variables
4. [ ] Run `prisma db push` via build command
5. [ ] Configure Resend domain (optional, for better deliverability)
6. [ ] Test end-to-end flow
