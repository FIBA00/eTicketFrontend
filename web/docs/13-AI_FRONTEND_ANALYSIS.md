# AI Frontend Analysis

## What the AI built

The AI-generated frontend is a working MVP with:
- React 18 + Vite + Tailwind CSS + shadcn/ui
- TanStack Query (React Query) for data fetching
- Wouter for routing
- Express 5 + Drizzle ORM backend (in `artifacts/api-server/`)
- OpenAPI spec → Orval generates Zod schemas + React Query hooks
- Offline queue with localStorage
- Idempotent ticket creation (client-generated UUIDs)

## Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| / | HomePage | Station overview, metrics |
| /ticketing | TicketingPage | Issue new tickets |
| /tickets | TicketsPage | Ticket register/list |
| /revenue | RevenuePage | Revenue & settlement |
| /settings | SettingsPage | Station settings |

## Strengths

1. **Offline queue pattern** — tickets queued in localStorage, synced when online
2. **Idempotency** — client-generated ticket IDs prevent duplicates on retry
3. **Fare calculation** — matches business rules (5%/4%, 15% VAT, 10% station fee, 5% commission)
4. **UI quality** — shadcn components, clean design, responsive
5. **Type safety** — generated types from OpenAPI spec

## Weaknesses (what we fixed/need to fix)

1. **No authentication** — anyone can access any page ✅ FIXED
2. **No role-based access** — no distinction between admin/ticketer ✅ FIXED
3. **Hardcoded data** — routes, vehicles, stations hardcoded in frontend
4. **Flat data model** — tickets not linked to routes/vehicles/users
5. **Float money** — uses `numeric` in DB, not integer cents
6. **No seat management** — no seat selection or locking
7. **Single station** — no multi-station support
8. **No user management** — can't create/edit users from UI

## Data model (AI version)

```typescript
// AI ticket table
ticketsTable = pgTable("transit_tickets", {
  id: text("id").primaryKey(),           // client-generated UUID
  routeId: text("route_id"),
  origin: text("origin"),                // denormalized
  destination: text("destination"),      // denormalized
  distanceKm: numeric("distance_km"),
  fareETB: numeric("fare_etb"),          // float!
  serviceChargeRate: numeric("service_charge_rate"),
  serviceChargeETB: numeric("service_charge_etb"),
  vatETB: numeric("vat_etb"),
  stationFeeETB: numeric("station_fee_etb"),
  totalETB: numeric("total_etb"),
  ticketerCommissionETB: numeric("ticketer_commission_etb"),
  vehiclePlate: text("vehicle_plate"),   // denormalized
  issuedAt: timestamp("issued_at"),
  createdAt: timestamp("created_at"),
});
```

## Data model (our v2)

```typescript
// Our ticket table
tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 20 }).unique(),
  routeId: uuid("route_id").references(() => routes.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  passengerName: varchar("passenger_name"),
  passengerPhone: varchar("passenger_phone"),
  seatNumber: integer("seat_number"),
  departureDate: timestamp("departure_date"),
  status: ticketStatusEnum("status"),
  fareCents: integer("fare_cents"),           // integer!
  serviceChargeCents: integer("service_charge_cents"),
  stationFeeCents: integer("station_fee_cents"),
  vatCents: integer("vat_cents"),
  totalCents: integer("total_cents"),
  commissionCents: integer("commission_cents"),
  ticketerId: uuid("ticketer_id").references(() => users.id),
  stationId: uuid("station_id").references(() => stations.id),
  clientMutationId: varchar("client_mutation_id").unique(),
  issuedAt: timestamp("issued_at"),
  voidedAt: timestamp("voided_at"),
  voidReason: varchar("void_reason"),
  version: integer("version"),
});
```

## Integration strategy

Keep the AI frontend's:
- UI components (shadcn)
- Offline queue pattern
- Page layouts
- OpenAPI client generation

Replace/Add:
- Authentication (done)
- API endpoints to match v2 backend
- Data fetching from v2 endpoints
- Money handling (integer cents)
- Seat management
- Multi-station support
