# Ticket Flow Update (Post-Proposal Review)

## Date: 2026-09-25

## Problem Identified

Original implementation assumed:

- Seat selection for each passenger
- Payment before printing
- Individual ticket issuance

**Real-world flow (from local experience):**

- No seat selection infrastructure
- Print first, collect cash after
- Batch printing for efficiency
- QR code for verification

## Changes Made

### 1. Removed Seat Selection

| Before                   | After   |
| ------------------------ | ------- |
| Seat map picker UI       | Removed |
| Seat number validation   | Removed |
| Seat availability check  | Removed |
| `seatNumber` field in DB | Removed |

### 2. Added Batch Printing

**New endpoints:**

```
POST /tickets/batch
{
  "routeId": "uuid",
  "vehicleId": "uuid",
  "driverName": "Abebe Kebede",
  "quantity": 20,
  "departureDate": "2026-09-25T14:00:00Z"
}

Response:
{
  "batchId": "uuid",
  "quantity": 20,
  "tickets": [...]
}
```

**New fields in tickets table:**

- `batchId` — UUID linking tickets in same batch
- `batchSequence` — Order in batch (1, 2, 3...)
- `driverName` — Driver for this departure

### 3. Added QR Code Verification

**QR Code Content:**

```
{ticketNumber}|{qrHash}
```

Example: `ET-2026-000001|a1b2c3d4e5f6`

**Verification endpoint:**

```
GET /tickets/verify/:ticketNumber?hash=xxx

Response:
{
  "valid": true,
  "ticket": { ... },
  "message": "OK"
}
```

**QR Hash generation:**

```typescript
const qrHash = crypto
  .createHash("sha256")
  .update(`${ticketNumber}${vehicleId}${departureDate}`)
  .digest("hex")
  .slice(0, 12);
```

### 4. Updated Ticket Issue Flow

```
┌─────────────────────────────────────────┐
│         ISSUE TICKET                    │
├─────────────────────────────────────────┤
│                                         │
│  Vehicle: [ET-12345 ▼]                  │
│  Driver: [Abebe Kebede]                 │
│  Route: [Addis → Adama ▼]               │
│  Departure: [Date] [Time]               │
│                                         │
│  Print Mode:                            │
│  (•) Single Ticket                      │
│  ( ) Batch: [ 20 ] tickets              │
│                                         │
│  Fare Summary:                          │
│  Base: 125.00 + SC: 5.00 + VAT: 0.75   │
│  + Station Fee: 0.50 = 131.25 ETB      │
│                                         │
│  [PRINT TICKET] or [PRINT BATCH]        │
│                                         │
└─────────────────────────────────────────┘
```

### 5. Updated Printed Ticket

```
┌──────────────────────────────┐
│     ADDIS ABABA CENTRAL      │
│                              │
│  Ticket: ET-2026-000001      │
│                              │
│      Addis Ababa → Adama     │
│         90 km                │
│                              │
│  Driver: Abebe Kebede        │
│  Vehicle: ET-12345           │
│  Departure: 25/09/2026 14:00 │
│                              │
│  ──────────────────────────  │
│  Fare: 131.25 ETB            │
│  ══════════════════════════  │
│                              │
│         ✓ PAID ✓             │
│                              │
│  ┌──────────────────────┐    │
│  │     [QR CODE]        │    │
│  │  ET-2026-000001|a1b2 │    │
│  └──────────────────────┘    │
│  Scan to verify              │
│                              │
│  Printed: 25/09/2026 13:45   │
│  Cashier: John Doe           │
│                              │
└──────────────────────────────┘
```

## Database Changes

### tickets table

**Removed:**

- `seatNumber` (integer)

**Added:**

- `driverName` (varchar 100)
- `qrHash` (varchar 12, unique index)
- `batchId` (varchar 36, index)
- `batchSequence` (integer)

**Modified:**

- `passengerName` — now optional, defaults to "Walk-in"

## API Changes

### New Endpoints

| Method | Path                          | Description            |
| ------ | ----------------------------- | ---------------------- |
| POST   | /tickets/batch                | Issue multiple tickets |
| GET    | /tickets/batch/:batchId       | Get batch summary      |
| GET    | /tickets/verify/:ticketNumber | Verify ticket by QR    |

### Modified Endpoints

| Method | Path     | Changes                              |
| ------ | -------- | ------------------------------------ |
| POST   | /tickets | Removed seatNumber, added driverName |
| GET    | /tickets | Added batchId filter                 |

## Frontend Changes

### New Pages

| Page          | Path                    | Description                             |
| ------------- | ----------------------- | --------------------------------------- |
| BatchViewPage | /tickets/batch/:batchId | View batch details, void unsold tickets |

### Updated Pages

| Page             | Changes                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| TicketIssuePage  | Removed seat map, added print mode (single/batch), added driver name field |
| TicketDetailPage | Updated to show QR code, driver name                                       |

### New Hooks

| Hook            | Description            |
| --------------- | ---------------------- |
| useIssueBatch   | Issue multiple tickets |
| useBatchSummary | Get batch details      |

## Files Modified

### Backend

- `apps/api/src/db/schema.ts` — Updated tickets table
- `apps/api/src/modules/tickets/tickets.service.ts` — Removed seat logic, added batch + QR
- `apps/api/src/modules/tickets/tickets.routes.ts` — Added batch endpoints

### Frontend

- `src/hooks/use-tickets.ts` — Added batch hooks
- `src/pages/ticket-issue.tsx` — Complete rewrite (no seats, add batch)
- `src/pages/batch-view.tsx` — New page
- `src/lib/printing/escpos.ts` — Added QR code support
- `src/App.tsx` — Added batch route

## Migration Required

```sql
-- Add new columns
ALTER TABLE tickets ADD COLUMN driver_name VARCHAR(100);
ALTER TABLE tickets ADD COLUMN qr_hash VARCHAR(12);
ALTER TABLE tickets ADD COLUMN batch_id VARCHAR(36);
ALTER TABLE tickets ADD COLUMN batch_sequence INTEGER;

-- Add indexes
CREATE UNIQUE INDEX tickets_qr_idx ON tickets(qr_hash);
CREATE INDEX tickets_batch_idx ON tickets(batch_id);

-- Remove seat column (optional, keep for historical data)
-- ALTER TABLE tickets DROP COLUMN seat_number;

-- Make passenger_name nullable
ALTER TABLE tickets ALTER COLUMN passenger_name DROP NOT NULL;
ALTER TABLE tickets ALTER COLUMN passenger_name SET DEFAULT 'Walk-in';
```

## Verification Flow

```
1. Passenger receives printed ticket with QR code
2. Station controller or security scans QR
3. System checks:
   - Ticket exists
   - QR hash matches
   - Status is ISSUED (not VOID)
4. Response shows:
   - Valid/Invalid
   - Route, vehicle, departure
   - Issue timestamp
```

## Benefits

| Benefit               | Description                                 |
| --------------------- | ------------------------------------------- |
| Faster issuance       | No seat selection, just print               |
| Batch efficiency      | Pre-print 20-50 tickets for busy departures |
| Anti-fraud            | QR verification prevents counterfeit        |
| Offline capable       | Works without network, sync later           |
| Simple reconciliation | Count printed vs sold vs returned           |
