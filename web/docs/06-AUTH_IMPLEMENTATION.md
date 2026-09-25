# Auth Implementation

## Files

| File | Purpose |
|------|---------|
| `apps/api/src/modules/auth/auth.routes.ts` | Backend: login, refresh, logout endpoints |
| `apps/api/src/shared/middleware/auth.ts` | Backend: JWT sign/verify, requireAuth, requireRole |
| `apps/api/src/db/schema.ts` | Backend: users, refresh_tokens tables |
| `artifacts/transit-eticket/src/lib/auth.ts` | Frontend: token storage, API calls, authFetch wrapper |
| `artifacts/transit-eticket/src/hooks/use-auth.tsx` | Frontend: React context, session restore |
| `artifacts/transit-eticket/src/pages/login.tsx` | Frontend: login page |
| `artifacts/transit-eticket/src/components/protected-route.tsx` | Frontend: route guard |
| `artifacts/transit-eticket/src/components/user-menu.tsx` | Frontend: user avatar + logout |

## Token flow

```
Login:
  Client → POST /auth/login { username, password }
  Server → verifies bcrypt hash
  Server → generates accessToken (15min) + refreshToken (7d)
  Server → hashes refreshToken, stores in refresh_tokens table
  Server → sets refreshToken as httpOnly cookie
  Server → returns both tokens + user object
  Client → stores accessToken in memory, refreshToken in localStorage

API request:
  Client → authTokenGetter() returns accessToken
  Client → adds Authorization: Bearer <accessToken> header
  Server → requireAuth middleware verifies JWT
  Server → attaches req.user = { userId, role, stationId }

Token expired (401):
  Client → catches 401
  Client → POST /auth/refresh { refreshToken }
  Server → verifies refreshToken JWT
  Server → checks refresh_tokens table (hash match, not revoked, not expired)
  Server → revokes old refreshToken, issues new pair
  Client → retries original request with new accessToken

Logout:
  Client → POST /auth/logout (with accessToken header)
  Server → revokes all refreshTokens for user
  Client → clears local tokens, redirects to /login
```

## Security notes

- Access token: 15min expiry, in-memory only (XSS-safe)
- Refresh token: 7d expiry, httpOnly cookie + localStorage backup, rotated on each use
- Refresh tokens hashed with bcrypt before DB storage
- Revocation: logout revokes all user refresh tokens
- Passwords: bcrypt cost 12
- CORS: credentials: true required for cookie flow

## Role-based access control

Backend middleware: `requireRole(...roles)`
Frontend wrapper: `<ProtectedRoute roles={[...]}>`

| Route | Backend roles | Frontend roles |
|-------|---------------|----------------|
| POST /auth/login | Public | Public |
| POST /auth/refresh | Public | Public |
| POST /auth/logout | Authenticated | Authenticated |
| GET /users | ADMIN, CONTROLLER | — |
| POST /users | ADMIN | — |
| GET /stations | Authenticated | Authenticated |
| POST /stations | ADMIN | — |
| GET /vehicles | Authenticated (station-scoped) | Authenticated |
| POST /vehicles | ADMIN, AGENT | — |
| GET /routes | Authenticated | Authenticated |
| POST /routes | ADMIN | — |
