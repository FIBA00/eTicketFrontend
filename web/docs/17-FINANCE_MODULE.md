# Finance Module (Week 6)

## Overview

Daily audits, commission tracking, and withdrawal management.

## Backend Endpoints

| Method | Path                            | Description             | Roles                       |
| ------ | ------------------------------- | ----------------------- | --------------------------- |
| POST   | /finance/daily-audit            | Generate audit for date | ADMIN, CONTROLLER, TICKETER |
| GET    | /finance/daily-audit?date=      | Get audit for date      | All                         |
| GET    | /finance/audit-history          | Get audit history       | All                         |
| GET    | /finance/commission             | Get ticketer commission | All                         |
| POST   | /finance/withdrawal             | Request withdrawal      | TICKETER, AGENT             |
| GET    | /finance/withdrawal             | Get withdrawal history  | All                         |
| POST   | /finance/withdrawal/:id/process | Process withdrawal      | ADMIN, CONTROLLER           |
| GET    | /finance/revenue                | Get revenue report      | ADMIN, CONTROLLER           |

## Business Logic

### Daily Audit

Aggregates all ISSUED tickets for a station on a given date:

```
totalTickets = COUNT(tickets)
totalFareCents = SUM(fare_cents)
totalServiceChargeCents = SUM(service_charge_cents)
totalStationFeeCents = SUM(station_fee_cents)
totalVatCents = SUM(vat_cents)
totalRevenueCents = SUM(total_cents)
totalCommissionCents = SUM(commission_cents)
netRevenueCents = totalServiceChargeCents - totalStationFeeCents - totalCommissionCents
```

Stored in `daily_audits` table with unique constraint on (station_id, date).

### Commission

Ticketers earn 5% of service charge per ticket.

```
weeklyCommission = SUM(commission_cents) WHERE issued_at BETWEEN weekStart AND weekEnd
alreadyWithdrawn = SUM(withdrawals) WHERE status IN (APPROVED, PAID)
availableCents = weeklyCommission - alreadyWithdrawn
```

### Withdrawal Flow

```
1. Ticketer requests withdrawal
   → Validate: amount <= availableCents
   → Validate: no pending withdrawal this week
   → Create with status = PENDING

2. Admin/Controller processes
   → APPROVE: status = APPROVED
   → REJECT: status = REJECTED
   → MARK_PAID: status = PAID (after payment)
```

## Frontend Pages

### Revenue Page (/revenue)

Tabs based on role:

| Tab            | Role     | Content                                      |
| -------------- | -------- | -------------------------------------------- |
| Overview       | Admin    | Today's audit, quick stats                   |
| Daily Audits   | Admin    | Audit history list                           |
| My Commission  | Ticketer | Commission summary, withdrawal form, history |
| Revenue Report | Admin    | Date range report with daily breakdown       |

## Files

### Backend

- `apps/api/src/modules/finance/finance.service.ts` — Business logic
- `apps/api/src/modules/finance/finance.routes.ts` — API endpoints

### Frontend

- `src/hooks/use-finance.ts` — React Query hooks
- `src/pages/revenue.tsx` — Finance page (replaces old placeholder)

## Database Tables Used

- `tickets` — Aggregated for audits
- `daily_audits` — Stores generated audits
- `withdrawals` — Withdrawal requests
- `users` — For validation
