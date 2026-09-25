# Frontend Auth Integration

## What was added to the AI frontend

The AI-generated frontend had no authentication. We added:

### New files

1. **`src/lib/auth.ts`** — Core auth logic
   - `login(credentials)` → calls backend, stores tokens
   - `logout()` → calls backend, clears local state
   - `refreshAccessToken()` → gets new access token using refresh token
   - `authFetch(path, options)` → fetch wrapper with auto-refresh on 401
   - Token storage: access in memory, refresh in localStorage

2. **`src/hooks/use-auth.tsx`** — React integration
   - `AuthProvider` — wraps app, provides auth state
   - `useAuth()` — hook for components
   - Session restore on mount (tries refresh if refreshToken exists)
   - `hasRole(...roles)` — role checking helper

3. **`src/pages/login.tsx`** — Login page
   - Username/password form
   - Error display
   - Demo account hints
   - Redirects to `/` on success

4. **`src/components/protected-route.tsx`** — Route guard
   - Shows loading spinner while restoring session
   - Redirects to `/login` if not authenticated
   - Redirects to `/` if wrong role

5. **`src/components/user-menu.tsx`** — User menu
   - Avatar with initials
   - Dropdown with name, username, role
   - Logout button

### Modified files

**`src/App.tsx`**:

- Added imports for auth components
- Wrapped app with `<AuthProvider>`
- Replaced `<Route component={X} />` with `<ProtectedRoute><AppShell><X /></AppShell></ProtectedRoute>`
- Added `/login` route (public)
- Added `UserMenu` to `AppShell` header
- Added `useEffect` to wire `setAuthTokenGetter` into API client

### Route protection map

| Path       | Component     | Roles                                      |
| ---------- | ------------- | ------------------------------------------ |
| /login     | LoginPage     | Public                                     |
| /          | HomePage      | Any authenticated                          |
| /ticketing | TicketingPage | TICKETER, SYSTEM_ADMIN, STATION_CONTROLLER |
| /tickets   | TicketsPage   | Any authenticated                          |
| /revenue   | RevenuePage   | SYSTEM_ADMIN, STATION_CONTROLLER           |
| /settings  | SettingsPage  | SYSTEM_ADMIN only                          |

## How the API client uses auth

The generated API client (`@workspace/api-client-react`) uses `customFetch` internally.
We configured it with `setAuthTokenGetter`:

```typescript
setAuthTokenGetter(async () => {
  let token = getAccessToken();
  if (!token) {
    const ok = await refreshAccessToken();
    if (ok) token = getAccessToken();
  }
  return token;
});
```

Before each request, `customFetch` calls this getter and adds the token as a Bearer header.

## Environment variables

Create `artifacts/transit-eticket/.env`:

```
VITE_API_URL=http://localhost:3000
```

## Demo accounts

| Username  | Password    | Role         |
| --------- | ----------- | ------------ |
| admin     | admin123    | SYSTEM_ADMIN |
| agent1    | agent123    | AGENT        |
| ticketer1 | ticketer123 | TICKETER     |
