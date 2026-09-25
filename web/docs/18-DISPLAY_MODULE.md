# Display Module (Week 7)

## Overview

Real-time station display board showing vehicle arrivals, departures, and seat availability.

## Types of Display

| Type | Route | Auth | Use Case |
|------|-------|------|----------|
| Internal | `/display` | Required | Staff dashboard view |
| Public | `/display/public/:stationId` | None | TV/monitor at station |

## Backend Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /display/stations | All stations with activity | Optional |
| GET | /display/station/:id | Full display data for station | Optional |
| GET | /display/my-station | Display for user's station | Required |
| POST | /display/station/:id/refresh | Force refresh | Admin/Controller |

## Vehicle Status Logic

```
Status determined by time until departure:

> 30 minutes  → ARRIVING (blue)
0-30 minutes  → BOARDING (green, pulsing)
< 0 minutes   → DEPARTED (gray)
```

## Display Data Structure

```typescript
{
  station: { id, name, code },
  incoming: Vehicle[],   // Next 30+ min
  active: Vehicle[],     // Boarding now (0-30 min)
  departed: Vehicle[],   // Last 5 departed
  lastUpdated: ISO string
}

Vehicle {
  id, plateNumber, type, capacity,
  status: "ARRIVING" | "BOARDING" | "DEPARTED",
  route: { origin, destination, distanceKm },
  departureTime: ISO string,
  availableSeats: number,
  totalSeats: number
}
```

## Frontend Pages

### Internal Display (`/display`)

- Station selector dropdown
- Refresh button
- Three sections: Now Boarding, Arriving Soon, Recently Departed
- Seat availability with color coding
- All stations summary cards

### Public Display (`/display/public/:stationId`)

- Full-screen dark theme for TVs
- Large clock and date
- Auto-refresh every 15 seconds
- Pulsing indicator for boarding vehicles
- No navigation — designed for passive viewing

## Refresh Intervals

| Context | Interval |
|---------|----------|
| Internal display | 30 seconds |
| Public display | 15 seconds |
| Station list | 60 seconds |

## Files

### Backend
- `apps/api/src/modules/display/display.service.ts` — Data aggregation
- `apps/api/src/modules/display/display.routes.ts` — Endpoints

### Frontend
- `src/hooks/use-display.ts` — React Query hooks
- `src/pages/display.tsx` — Internal display page
- `src/pages/display-public.tsx` — Public TV display
- `src/App.tsx` — Routes added

## Future Enhancements

- WebSocket for real-time updates (no polling)
- Announcement banner (delays, etc.)
- Multi-language support
- QR code for passenger info
- Integration with station PA system
