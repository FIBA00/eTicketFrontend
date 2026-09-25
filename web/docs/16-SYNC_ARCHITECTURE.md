# Sync Architecture (Week 5)

## Overview

Offline-first sync between web/mobile clients and backend.

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Web App   │      │ Mobile App  │      │   Backend   │
│             │      │             │      │             │
│ localStorage│      │   SQLite    │      │ PostgreSQL  │
│    Queue    │      │    Queue    │      │  sync_log   │
└──────┬──────┘      └──────┬──────┘      └──────▲──────┘
       │                    │                    │
       │    POST /sync/push │                    │
       ├────────────────────┼────────────────────┤
       │                    │                    │
       │    GET /sync/pull  │                    │
       ├────────────────────┼────────────────────┤
       │                    │                    │
```

## Components

| Component          | Location | Purpose                                              |
| ------------------ | -------- | ---------------------------------------------------- |
| `sync.service.ts`  | Backend  | Process mutations, handle conflicts, log to sync_log |
| `sync.routes.ts`   | Backend  | POST /sync/push, GET /sync/pull, GET /sync/status    |
| `offline-queue.ts` | Web      | localStorage queue for mutations                     |
| `sync-engine.ts`   | Web      | Push/pull logic, auto-sync, online detection         |
| `sync-status.tsx`  | Web      | UI component showing sync state                      |
| `engine.ts`        | Mobile   | SQLite queue sync (already exists)                   |

## Sync Flow

### 1. Queue Mutation (Offline)

**Web:**

```typescript
queueTicketIssue({
  routeId, vehicleId, passengerName, seatNumber, ...
});
// Saves to localStorage with clientMutationId (UUID)
```

**Mobile:**

```typescript
await addToSyncQueue({
  id: clientMutationId,
  table: "tickets",
  operation: "CREATE",
  payload: ticketData,
});
// Saves to SQLite
```

### 2. Push to Server

**Request:**

```json
POST /api/v1/sync/push
{
  "mutations": [
    {
      "id": "uuid-client-mutation-id",
      "table": "tickets",
      "operation": "CREATE",
      "payload": { ...ticket data... },
      "baseVersion": 0,
      "stationId": "uuid",
      "deviceId": "web|mobile-device-id",
      "createdAt": "2026-09-25T16:00:00Z"
    }
  ]
}
```

**Response:**

```json
{
  "applied": [{ "clientMutationId": "uuid", "serverVersion": 1 }],
  "conflicts": [
    { "clientMutationId": "uuid", "reason": "Seat 5 already taken" }
  ],
  "rejected": [{ "clientMutationId": "uuid", "reason": "Invalid route" }]
}
```

### 3. Conflict Resolution

| Conflict Type      | Handling                                |
| ------------------ | --------------------------------------- |
| Seat already taken | Mark as CONFLICT, alert user to reissue |
| Duplicate mutation | Return existing ticket (idempotent)     |
| Invalid data       | REJECT with reason                      |
| Network error      | Retry with exponential backoff          |

### 4. Pull Updates

**Request:**

```
GET /api/v1/sync/pull?since=0&limit=100
```

**Response:**

```json
{
  "mutations": [...],
  "currentVersion": 42
}
```

Client invalidates relevant React Query caches to refetch fresh data.

## Idempotency

Every mutation has `clientMutationId` (UUID generated client-side).

Server `sync_log` table has unique constraint:

```sql
UNIQUE(station_id, client_mutation_id)
```

If same mutation pushed twice:

1. Server checks sync_log
2. If already APPLIED → return success with existing ticket
3. If CONFLICT → return conflict reason
4. If REJECTED → return rejection reason

## Auto-Sync

| Platform | Trigger                | Interval   |
| -------- | ---------------------- | ---------- |
| Web      | Online event + polling | 5 minutes  |
| Mobile   | Background fetch       | 15 minutes |

## Files Changed (Week 5)

### Backend

- `apps/api/src/modules/sync/sync.service.ts` — NEW
- `apps/api/src/modules/sync/sync.routes.ts` — UPDATED

### Web

- `src/lib/offline-queue.ts` — NEW
- `src/lib/sync-engine.ts` — NEW
- `src/components/sync-status.tsx` — NEW
- `src/pages/ticket-issue.tsx` — UPDATED (offline support)
- `src/App.tsx` — UPDATED (auto-sync init)

### Mobile

- No changes (already has sync)
