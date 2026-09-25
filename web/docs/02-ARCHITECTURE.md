# Architecture

## System diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Android/POS   │     │   React Web     │     │  Station Board  │
│   (future)      │     │   (this)        │     │  (future)       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    HTTP + JWT         │    HTTP + JWT         │
         │                       │                       │
         └───────────┬───────────┴───────────┬───────────┘
                     │                       │
              ┌──────┴──────┐         ┌──────┴──────┐
              │  Express API │         │  Express API │
              │  (v2 backend)│         │  (AI server) │
              └──────┬──────┘         └──────┬──────┘
                     │                       │
                     │    Drizzle ORM        │
                     │                       │
              ┌──────┴──────┐         ┌──────┴──────┐
              │  PostgreSQL  │         │  PostgreSQL  │
              │  (authoritative)│      │  (AI demo)   │
              └─────────────┘         └─────────────┘
```

## Backend structure (v2)

```
apps/api/src/
├── db/
│   ├── schema.ts          # All tables, enums, relations
│   └── index.ts           # Drizzle client + pg Pool
├── config/
│   └── index.ts           # Env validation (Zod)
├── shared/
│   ├── db.ts              # (legacy, use db/ instead)
│   ├── logger.ts          # Pino
│   ├── errors.ts          # AppError + helpers
│   ├── utils.ts           # asyncHandler, validate, ticket number gen
│   └── middleware/
│       ├── auth.ts        # JWT sign/verify, requireAuth, requireRole
│       └── error.ts       # Error handler + 404
└── modules/
    ├── auth/              # login, refresh, logout
    ├── users/             # CRUD + role management
    ├── stations/          # CRUD + version increment
    ├── vehicles/          # CRUD + agent scoping + joins
    ├── routes/            # CRUD + station joins
    ├── tickets/           # placeholder (Week 3)
    ├── finance/           # placeholder (Week 6)
    ├── sync/              # placeholder (Week 5)
    └── display/           # placeholder (Week 7)
```

## Frontend structure (AI + our auth)

```
artifacts/transit-eticket/src/
├── lib/
│   └── auth.ts            # Token management, authFetch wrapper
├── hooks/
│   └── use-auth.tsx       # Auth context provider
├── pages/
│   ├── login.tsx          # Login page (NEW)
│   └── not-found.tsx
├── components/
│   ├── protected-route.tsx # Route guard (NEW)
│   ├── user-menu.tsx       # Avatar + logout (NEW)
│   ├── error-boundary.tsx
│   └── ui/                 # shadcn components
├── App.tsx                 # Routes + auth wiring (PATCHED)
└── main.tsx
```

## Data flow (auth)

1. User submits login form → `POST /api/v1/auth/login`
2. Backend returns `accessToken` (15min) + `refreshToken` (7d)
3. Frontend stores access in memory, refresh in localStorage
4. `setAuthTokenGetter` wires token into generated API client
5. Before each API request, client calls getter → returns access token
6. If no token, auto-refresh via `POST /api/v1/auth/refresh`
7. On 401 response, retry once after refresh
8. Logout → `POST /api/v1/auth/logout` + clear local tokens
