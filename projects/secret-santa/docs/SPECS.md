# Secret Santa Gift Exchange Application

## Project Overview

A web application that facilitates Secret Santa (grab bag) gift exchanges by randomly assigning participants to buy gifts for each other, ensuring no one is assigned themselves, and keeping assignments secret - even from the administrator.

> **Note**: While commonly called "White Elephant" colloquially, this app implements **Secret Santa** mechanics (pre-assigned gift recipients), not the live stealing/swapping game of traditional White Elephant.

## Core Features

### 1. Event Management (Admin)
- Create new gift exchange events
- Set event name, date, budget limit, and custom rules
- Add/remove participants (name, email) **before randomization only**
- Optional: Set exclusion pairs (e.g., spouses shouldn't draw each other)
- Trigger randomization when ready (**locks participant list**)
- Send notifications to all participants
- **Resend individual invites** (blindly, without revealing assignment)
- View participation status: **"Not Sent" → "Sent" → "Viewed"**
- Admin accesses dashboard via **GUID-based admin link** (simpler than NextAuth)

### 2. Assignment Algorithm
- **Derangement Algorithm**: Mathematical guarantee that no participant is assigned themselves
- **Exclusion Support**: Respect exclusion pairs when generating assignments
- **Deadlock Detection**: Alert admin if constraints make valid assignment impossible
- **One-time Generation**: Assignments are generated once and stored, not computed on-the-fly
- **Idempotent Access**: Same link always shows same assignment

### 3. Participant Experience
- Receive notification (email or manual link share)
- Click unique GUID-based link
- View their assigned recipient's name
- View event rules, budget, and date
- Optional: See recipient's wishlist/interests if provided

### 4. Privacy & Security
- **Blind Administration**: Admin can manage participants but cannot see who is assigned to whom
- **GUID Links**: Unguessable UUIDs for participant access (no sequential IDs)
- **No Authentication Required**: Participants access via unique link only
- **Admin Authentication**: Simple password protection for admin dashboard

## Technical Specifications

### Tech Stack
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | Next.js 14 (App Router) | Native Vercel optimization, RSC for performance |
| Database | Vercel Postgres | Seamless Vercel integration, serverless-friendly |
| ORM | Prisma | Type-safe database access, migrations |
| Auth | GUID-based admin links | No user accounts needed, simpler UX |
| UI | Tailwind CSS + shadcn/ui | Modern, accessible, customizable |
| Email | Resend | Vercel-friendly, excellent deliverability |
| Hosting | Vercel | Target platform |

### Database Schema

```
Event
├── id (UUID, PK)
├── name (String)
├── adminToken (UUID, unique) ← GUID for admin access
├── budget (String, optional)
├── eventDate (DateTime, optional)
├── rules (Text, optional)
├── isLocked (Boolean, default: false) ← Locks after randomization
├── createdAt (DateTime)
└── updatedAt (DateTime)

Participant
├── id (UUID, PK)
├── eventId (UUID, FK → Event)
├── name (String)
├── email (String, optional)
├── accessToken (UUID, unique) ← GUID for link access
├── assignedToId (UUID, FK → Participant, nullable)
├── notificationStatus (Enum: NOT_SENT, SENT, VIEWED)
├── notifiedAt (DateTime, nullable)
├── viewedAt (DateTime, nullable)
├── createdAt (DateTime)
└── updatedAt (DateTime)

Exclusion
├── id (UUID, PK)
├── eventId (UUID, FK → Event)
├── participant1Id (UUID, FK → Participant)
├── participant2Id (UUID, FK → Participant)
└── createdAt (DateTime)
```

### API Routes

```
POST   /api/events                    Create new event (returns adminToken)
GET    /api/admin/[adminToken]        Get event details (admin view, no assignments)
PUT    /api/admin/[adminToken]        Update event settings
DELETE /api/admin/[adminToken]        Delete event

POST   /api/admin/[adminToken]/participants      Add participant (if not locked)
DELETE /api/admin/[adminToken]/participants/[pid] Remove participant (if not locked)

POST   /api/admin/[adminToken]/randomize   Generate assignments (locks event)
POST   /api/admin/[adminToken]/notify      Send email to all participants
POST   /api/admin/[adminToken]/resend/[pid] Resend email to specific participant

GET    /api/reveal/[accessToken]      Get assignment for participant (public)
```

### Page Routes

```
/                           Landing page (create new event)
/admin/[adminToken]         Admin dashboard for specific event
/reveal/[accessToken]       Participant view (see assignment)
```

## User Flows

### Admin Flow
1. Navigate to `/` (landing page)
2. Create new event with name, date, budget, rules
3. **Receive admin link** (save this - it's your only access!)
4. Add participants (name + optional email)
5. Click "Randomize" to generate assignments (locks participant list)
6. Choose notification method per participant:
   - **Email**: Send via Resend (if email provided)
   - **Copy Link**: Get shareable link for manual distribution (WhatsApp, DM, etc.)
7. Monitor who has viewed their assignment
8. Resend invites as needed for participants who haven't viewed

### Participant Flow
1. Receive link via email/message
2. Click link → `/reveal/[accessToken]`
3. See: "You are buying a gift for: **[Name]**"
4. See: Event rules, budget, date
5. Optional: See recipient's wishlist

## Edge Cases & Handling

### Minimum Participants
- Require at least 3 participants to randomize
- Display clear error if fewer

### Exclusion Deadlocks
- If exclusions make valid assignment impossible, show error
- Example: 4 people where A↔B and C↔D are excluded = impossible

### Late Additions
- Cannot add participants after randomization
- Admin must create new event or re-randomize (with warning)

### Participant Removal
- Cannot remove after randomization
- Would break assignment chain

### Re-randomization
- Allowed but requires confirmation
- Clears all "viewed" statuses
- Old links remain valid but show new assignments

## MVP Scope (Phase 1)

### Included
- [x] Event creation with name, date, budget, rules
- [x] Participant management (add/remove before randomization)
- [x] Derangement algorithm for assignment
- [x] GUID-based reveal links
- [x] Participant reveal page
- [x] Admin view of participation status
- [x] Copy-to-clipboard link sharing
- [x] Email notifications via Resend
- [x] Mobile-responsive UI

### Excluded from MVP (Future)
- [ ] Exclusion pairs
- [ ] Wishlists/preferences
- [ ] Multiple admin users
- [ ] Event history/archives
- [ ] "Guess who drew you" feature
- [ ] SMS notifications

## Security Considerations

1. **Admin Tokens**: Cryptographically random UUIDs for admin access
2. **Access Tokens**: Cryptographically random UUIDs for participant access
3. **No PII in URLs**: Only random tokens in public URLs
4. **Rate Limiting**:
   - Email endpoints: Max 10 requests per minute per event
   - Reveal endpoints: Max 30 requests per minute per token
   - Use Vercel KV or in-memory rate limiting
5. **HTTPS Only**: Enforced by Vercel
6. **Blind Admin API**: Admin endpoints never return assignment mappings

## Success Metrics

- Admin can create event and add participants in < 2 minutes
- Randomization completes in < 1 second for up to 100 participants
- Participant can view assignment in < 3 seconds
- Zero cases of self-assignment
- 100% email deliverability via Resend
