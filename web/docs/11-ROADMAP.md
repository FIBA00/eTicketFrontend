# Roadmap

## Completed

### Week 1: Foundation

- [x] Backend v2 scaffold (Express + Drizzle + PostgreSQL)
- [x] Auth module (login, refresh, logout, JWT)
- [x] Users module (CRUD + roles)
- [x] Stations module (CRUD)
- [x] Vehicles module (CRUD + agent scoping)
- [x] Routes module (CRUD)
- [x] Shared packages (types + money calculation)
- [x] Docker compose setup
- [x] Seed data
- [x] Documentation

### Auth Integration

- [x] Frontend auth lib (token management)
- [x] Auth context + hooks
- [x] Login page
- [x] Protected routes with role checks
- [x] User menu in header
- [x] API client auth wiring
- [x] Session restore on app load

## Upcoming

### Week 2: Data management UI

- [ ] Stations list/create/edit page
- [ ] Vehicles list/create/edit page
- [ ] Routes list/create/edit page
- [ ] Users management page (admin)
- [ ] Replace hardcoded frontend data with API calls

### Week 3: Ticket issuing

- [ ] Backend: ticket issue endpoint with seat locking
- [ ] Backend: ticket void endpoint
- [ ] Backend: seat map endpoint
- [ ] Frontend: ticketing page with seat selection
- [ ] Frontend: ticket print view
- [ ] Fare calculation integration

### Week 4: Android app

- [ ] React Native or native Kotlin app
- [ ] SQLite local storage
- [ ] Offline ticket queue
- [ ] Bluetooth thermal printer integration

### Week 5: Sync

- [ ] Backend: sync push endpoint (idempotent)
- [ ] Backend: sync pull endpoint
- [ ] Backend: conflict resolution
- [ ] Frontend: offline queue with localStorage
- [ ] Frontend: auto-sync when online

### Week 6: Finance

- [ ] Backend: daily audit endpoint
- [ ] Backend: commission calculation
- [ ] Backend: withdrawal request/approval
- [ ] Frontend: revenue dashboard
- [ ] Frontend: audit report view

### Week 7: Station display

- [ ] Backend: display feed endpoint
- [ ] Frontend: public display board (read-only)
- [ ] Real-time updates (polling or WebSocket)

### Week 8: Hardening

- [ ] Field testing at pilot station
- [ ] Performance optimization
- [ ] Security audit
- [ ] Backup/restore procedures
- [ ] User training materials

## Future considerations

- Multi-language support (Afaan Oromo, Amharic, English)
- SMS notifications for passengers
- Mobile money integration (Telebirr, M-Pesa)
- Advanced reporting (Excel export, charts)
- Integration with government tax systems
- Vehicle GPS tracking
