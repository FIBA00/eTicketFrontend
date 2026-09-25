# Transit E-Ticket — Full Stack

Integrated frontend + backend for Ethiopian bus station e-ticketing.

## Structure

```
├── artifacts/
│   ├── api-server/          # Express 5 + Drizzle backend (from AI)
│   └── transit-eticket/     # React frontend (from AI, now with auth)
├── lib/
│   ├── api-client-react/    # Generated React Query hooks (Orval)
│   ├── api-spec/            # OpenAPI spec
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle schema + client
└── packages/                # (from v2 backend — optional integration)
```

## Auth Feature (NEW)

The frontend now has full authentication integrated with the v2 backend:

| File                                 | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `src/lib/auth.ts`                    | Token management, login/logout/refresh, `authFetch` wrapper |
| `src/hooks/use-auth.tsx`             | React context, session restore, `useAuth()` hook            |
| `src/pages/login.tsx`                | Login page with demo accounts                               |
| `src/components/protected-route.tsx` | Route guard with role checks                                |
| `src/components/user-menu.tsx`       | User avatar + logout in header                              |

## Protected Routes

| Route        | Roles                                      |
| ------------ | ------------------------------------------ |
| `/login`     | Public                                     |
| `/`          | All authenticated                          |
| `/ticketing` | TICKETER, SYSTEM_ADMIN, STATION_CONTROLLER |
| `/tickets`   | All authenticated                          |
| `/revenue`   | SYSTEM_ADMIN, STATION_CONTROLLER           |
| `/settings`  | SYSTEM_ADMIN only                          |

## Quick start

### Backend (v2)

```bash
cd /path/to/e-ticket-v2/apps/api
npm run dev   # Runs on :3000
```

### Frontend

```bash
cd artifacts/transit-eticket
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3000
pnpm install
pnpm dev
```

### Demo accounts

| Username  | Password    | Role         |
| --------- | ----------- | ------------ |
| admin     | admin123    | SYSTEM_ADMIN |
| agent1    | agent123    | AGENT        |
| ticketer1 | ticketer123 | TICKETER     |

## How auth works

1. Login → backend returns `accessToken` (15min) + `refreshToken` (7d)
2. Access token stored in memory, refresh token in localStorage
3. API client (`customFetch`) calls `authTokenGetter` before each request
4. If no access token, auto-refresh via `/auth/refresh`
5. On 401 response, retry once after refresh
6. Logout clears tokens + calls backend `/auth/logout`
