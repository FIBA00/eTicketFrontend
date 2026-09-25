# Offline Sync Architecture

## Problem

Bus stations may have poor or no internet connectivity. Ticketers must be able to:
- Issue tickets without network
- View reference data (routes, vehicles) offline
- Sync when network becomes available

## Solution

```
┌─────────────────────────────────────────┐
│           Mobile App                    │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  UI     │  │ SQLite  │  │  Queue  │ │
│  │ Screens │◄─┤ Local   │◄─┤  Sync   │ │
│  │         │  │ Storage │  │  Queue  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘ │
│       │            │            │       │
│       └────────────┴────────────┘       │
│                    │                    │
│              ┌─────┴─────┐              │
│              │   Sync    │              │
│              │  Engine   │              │
│              └─────┬─────┘              │
└────────────────────┼────────────────────┘
                     │
              ┌──────┴──────┐
              │   Backend   │
              │   API       │
              └─────────────┘
```

## SQLite Schema

### local_tickets
Stores tickets issued offline, pending sync.

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT PK | Local UUID |
| ticket_number | TEXT | Generated locally |
| route_id | TEXT | Reference to route |
| vehicle_id | TEXT | Reference to vehicle |
| passenger_name | TEXT | Passenger name |
| passenger_phone | TEXT | Optional phone |
| seat_number | INTEGER | Seat selected |
| departure_date | TEXT | ISO date |
| fare_cents | INTEGER | Calculated fare |
| ... | ... | Full breakdown |
| client_mutation_id | TEXT UNIQUE | Idempotency key |
| sync_status | TEXT | PENDING/SYNCED/FAILED |
| sync_error | TEXT | Error message if failed |

### sync_queue
Queue of mutations to push to server.

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT PK | UUID |
| table_name | TEXT | Target table |
| operation | TEXT | CREATE/UPDATE/DELETE |
| payload | TEXT | JSON payload |
| retry_count | INTEGER | Failed attempts |
| last_error | TEXT | Last error message |

### cached_stations / cached_routes / cached_vehicles
Reference data for offline use.

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT PK | Entity ID |
| data | TEXT | Full JSON object |
| cached_at | TEXT | When cached |

### seat_reservations
Local seat tracking to prevent double-booking offline.

| Column | Type | Purpose |
|--------|------|---------|
| vehicle_id | TEXT | Vehicle |
| departure_date | TEXT | Date |
| seat_number | INTEGER | Seat |
| ticket_id | TEXT | Local ticket ID |
| reserved_at | TEXT | Timestamp |

## Sync Flow

### 1. Queue Mutation (Offline)

```typescript
async function issueTicketOffline(ticketData) {
  const clientMutationId = uuidv4();

  // Save locally
  await insertLocalTicket({ ...ticketData, clientMutationId });

  // Reserve seat locally
  await reserveSeat(vehicleId, date, seatNumber, ticketId);

  // Queue for sync
  await addToSyncQueue({
    id: clientMutationId,
    table: "tickets",
    operation: "CREATE",
    payload: ticketData,
  });
}
```

### 2. Push to Server (Online)

```typescript
async function syncNow() {
  if (!await isOnline()) return;

  const queue = await getSyncQueue();

  for (const item of queue) {
    try {
      const result = await api.post("/sync/push", {
        mutations: [{
          id: item.id,
          table: item.table_name,
          operation: item.operation,
          payload: JSON.parse(item.payload),
        }]
      });

      if (result.applied.length > 0) {
        await markTicketSynced(item.id);
        await removeFromSyncQueue(item.id);
      } else if (result.conflicts.length > 0) {
        // Handle conflict — seat taken, etc.
        await markTicketFailed(item.id, result.conflicts[0].reason);
      }
    } catch (err) {
      await incrementRetry(item.id, err.message);
    }
  }
}
```

### 3. Conflict Resolution

| Conflict | Resolution |
|----------|------------|
| Seat already taken | Mark ticket FAILED, alert user to reissue with different seat |
| Duplicate mutation | Server returns existing ticket (idempotent) |
| Network error | Retry with exponential backoff |

## Background Sync

Uses `expo-background-fetch` to sync every 15 minutes:

```typescript
TaskManager.defineTask("eticket-background-sync", async () => {
  const result = await syncNow();
  await pullReferenceData();
  return result.synced > 0 ? NewData : NoData;
});

await BackgroundFetch.registerTaskAsync("eticket-background-sync", {
  minimumInterval: 15 * 60, // 15 minutes
  stopOnTerminate: false,
  startOnBoot: true,
});
```

## Idempotency

Every ticket has a `clientMutationId` (UUID generated on device). Server has unique constraint:

```sql
CREATE UNIQUE INDEX tickets_mutation_idx ON tickets(client_mutation_id);
```

If same mutation pushed twice, server returns existing ticket instead of creating duplicate.
