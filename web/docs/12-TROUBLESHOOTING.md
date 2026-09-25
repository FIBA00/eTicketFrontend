# Troubleshooting

## Backend issues

### "Invalid environment variables"
Check `.env` file exists and has all required fields:
- DATABASE_URL
- JWT_SECRET (min 16 chars)
- JWT_REFRESH_SECRET (min 16 chars)

### "Connection refused" on database
Make sure PostgreSQL is running:
```bash
docker compose -f infra/docker-compose.yml up -d db
# or
pg_isready -h localhost -p 5432
```

### Migration errors
If migration fails, check:
1. DATABASE_URL is correct
2. Database exists: `createdb eticket` or `psql -c "CREATE DATABASE eticket;"`
3. No conflicting tables: `psql eticket -c "\dt"`

### "Unauthorized" on every request
- Check Authorization header format: `Bearer <token>`
- Check JWT_SECRET matches between token generation and verification
- Check token hasn't expired (15min default)

## Frontend issues

### "Not authenticated" errors
- Check localStorage has `refreshToken`
- Try logging out and back in
- Check `VITE_API_URL` in `.env` matches backend URL

### CORS errors
- Backend must have `credentials: true` in CORS config
- Frontend must send `credentials: "include"` in fetch
- Check browser console for exact CORS error

### Blank page after login
- Check browser console for errors
- Verify `AuthProvider` wraps the app in `App.tsx`
- Check `ProtectedRoute` isn't redirecting in a loop

## Database issues

### Reset database (development only)
```bash
psql -c "DROP DATABASE eticket;"
psql -c "CREATE DATABASE eticket;"
npm run db:migrate
npm run db:seed
```

### Check table contents
```bash
psql eticket -c "SELECT * FROM users;"
psql eticket -c "SELECT * FROM stations;"
```

## Common commands

```bash
# Backend
npm run dev          # Start dev server
npm run db:studio    # Open Drizzle Studio (DB GUI)
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations

# Frontend
pnpm dev             # Start dev server
pnpm build           # Production build
pnpm typecheck       # TypeScript check
```
