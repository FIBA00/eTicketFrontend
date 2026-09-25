// SQLite schema for offline storage
// Executed on app first launch

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
-- Tickets issued locally, pending sync
CREATE TABLE IF NOT EXISTS local_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT,
  route_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT,
  seat_number INTEGER NOT NULL,
  departure_date TEXT NOT NULL,
  status TEXT DEFAULT 'ISSUED',
  fare_cents INTEGER NOT NULL,
  service_charge_cents INTEGER NOT NULL,
  station_fee_cents INTEGER NOT NULL,
  vat_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  ticketer_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  client_mutation_id TEXT UNIQUE NOT NULL,
  issued_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'PENDING',
  sync_error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sync queue for mutations
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  base_version INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Cached reference data (stations, routes, vehicles)
CREATE TABLE IF NOT EXISTS cached_stations (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cached_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_routes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cached_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cached_vehicles (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cached_at TEXT DEFAULT (datetime('now'))
);

-- Seat reservations (optimistic locking)
CREATE TABLE IF NOT EXISTS seat_reservations (
  vehicle_id TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  ticket_id TEXT NOT NULL,
  reserved_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (vehicle_id, departure_date, seat_number)
);

-- App metadata
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_sync ON local_tickets(sync_status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_seats_lookup ON seat_reservations(vehicle_id, departure_date);
`;
