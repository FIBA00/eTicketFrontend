# E-Ticket Mobile App

React Native + Expo app for offline-first bus ticket issuing.

## Purpose

- Ticket issuers (ticketers) use this app at bus stations
- Works fully offline — tickets queued locally, synced when network available
- Prints tickets via Bluetooth thermal printer (future)
- Targets Sun Mi V2 POS and regular Android devices

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo |
| Navigation | Expo Router (file-based) |
| Local DB | Expo SQLite |
| HTTP | Fetch + custom auth wrapper |
| State | TanStack Query (React Query) |
| Background | expo-background-fetch |
| Storage | expo-secure-store (tokens) |

## Project Structure

```
eticket-mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/
│   │   └── login.tsx       # Login screen
│   ├── (app)/
│   │   ├── _layout.tsx     # Tab navigation
│   │   ├── index.tsx       # Home / dashboard
│   │   ├── issue.tsx       # Ticket issuing (offline)
│   │   ├── tickets.tsx     # Local ticket list
│   │   ├── sync.tsx        # Sync status & manual sync
│   │   └── settings.tsx    # User info & logout
│   └── _layout.tsx         # Root layout with auth check
├── src/
│   ├── api/                # API client
│   │   └── client.ts
│   ├── auth/               # Token storage
│   │   └── tokens.ts
│   ├── db/                 # SQLite layer
│   │   ├── schema.ts
│   │   └── client.ts
│   ├── sync/               # Sync engine
│   │   ├── engine.ts
│   │   └── background.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   └── utils/              # Utilities
│       └── money.ts
├── assets/                 # App icons (placeholder)
├── docs/                   # Documentation
├── app.json                # Expo config
├── eas.json                # Build config
└── package.json
```

## Key Features

1. **Offline Ticket Issuing**
   - Select route, vehicle, date, seat
   - Enter passenger info
   - Calculate fare locally
   - Save to SQLite with unique clientMutationId
   - Queue for sync

2. **Background Sync**
   - Every 15 minutes when app is backgrounded
   - Pushes pending tickets to server
   - Pulls updated reference data (stations, routes, vehicles)
   - Handles conflicts (seat already taken)

3. **Local Data Cache**
   - Stations, routes, vehicles cached in SQLite
   - App works without network for reference data
   - Seat reservations tracked locally

4. **Auth**
   - JWT access + refresh tokens
   - Tokens stored in expo-secure-store
   - Auto-refresh on 401

## Data Flow

```
Ticket Issue (Offline):
  User fills form → App validates → Save to SQLite
  → Generate clientMutationId → Queue for sync
  → Show success + ticket details

Background Sync:
  Network available? → Push queue to /sync/push
  → Handle response (applied/conflict/rejected)
  → Update local status → Pull reference data
```
