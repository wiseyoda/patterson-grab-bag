# Testing Plan - Secret Santa Gift Exchange

## Test Categories

### 1. Unit Tests (Derangement Algorithm)

**File**: `tests/lib/derangement.test.ts`

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `should throw error for less than 2 items` | Call with 0 or 1 items | Throws error |
| `should generate valid derangement for 2 items` | Call with 2 items | No self-assignments |
| `should generate valid derangement for 3 items` | Call with 3 items | No self-assignments |
| `should generate valid derangement for large group` | Call with 100 items | No self-assignments |
| `should never assign anyone to themselves` | Run 1000 times with 10 items | All 1000 pass |
| `should include all participants` | Any input size | All items appear exactly once in output |

### 2. API Integration Tests

**File**: `tests/app/api/events.test.ts`

| Test Case | Endpoint | Expected Result |
|-----------|----------|-----------------|
| Create event with valid data | POST /api/events | 200, returns adminToken |
| Create event without name | POST /api/events | 400, error message |
| Get event with valid adminToken | GET /api/admin/[token] | 200, event data |
| Get event with invalid token | GET /api/admin/[token] | 404 |
| Add participant to unlocked event | POST /api/admin/[token]/participants | 200 |
| Add participant to locked event | POST /api/admin/[token]/participants | 400 |
| Remove participant from unlocked event | DELETE /api/admin/[token]/participants/[id] | 200 |
| Remove participant from locked event | DELETE /api/admin/[token]/participants/[id] | 400 |
| Randomize with < 3 participants | POST /api/admin/[token]/randomize | 400 |
| Randomize with 3+ participants | POST /api/admin/[token]/randomize | 200, locks event |
| Randomize already locked event | POST /api/admin/[token]/randomize | 409 |
| Reveal with valid accessToken | GET /api/reveal/[token] | 200, assignment data |
| Reveal with invalid token | GET /api/reveal/[token] | 404 |
| Reveal before randomization | GET /api/reveal/[token] | 400 |

### 3. Business Logic Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Admin cannot see assignments | GET /api/admin/[token] | No assignedToId in response |
| Participant can see their assignment | GET /api/reveal/[token] | Returns assignedToName |
| Viewing marks participant as viewed | GET /api/reveal/[token] | notificationStatus = VIEWED |
| Re-viewing shows same assignment | GET /api/reveal/[token] twice | Same result |

## Test Setup

### Install Testing Dependencies

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

### Jest Configuration

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

## Implementation Priority

1. **Critical**: Derangement algorithm tests (core logic)
2. **High**: Randomize endpoint tests (no self-assignments)
3. **Medium**: CRUD operations tests
4. **Low**: Email integration tests (mock Resend)

## Manual Test Checklist

- [ ] Create new event from landing page
- [ ] Verify admin link redirects correctly
- [ ] Add 3+ participants
- [ ] Generate assignments
- [ ] Copy participant link and open in new browser
- [ ] Verify reveal page shows assignment
- [ ] Verify admin sees "Viewed" status
- [ ] Verify cannot add participants after randomization
- [ ] Verify cannot re-randomize locked event
