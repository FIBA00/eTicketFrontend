import * as SQLite from "expo-sqlite";
import { CREATE_TABLES, SCHEMA_VERSION } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("eticket.db");
  await db.execAsync(CREATE_TABLES);
  await ensureSchemaVersion(db);
  return db;
}

async function ensureSchemaVersion(database: SQLite.SQLiteDatabase) {
  const result = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schema_version'"
  );

  if (!result) {
    await database.runAsync(
      "INSERT INTO app_meta (key, value) VALUES ('schema_version', ?)",
      [SCHEMA_VERSION.toString()]
    );
  } else if (parseInt(result.value, 10) < SCHEMA_VERSION) {
    // Run migrations here when schema changes
    await database.runAsync(
      "UPDATE app_meta SET value = ? WHERE key = 'schema_version'",
      [SCHEMA_VERSION.toString()]
    );
  }
}

// ── Ticket operations ────────────────────────────────────────

export async function insertLocalTicket(ticket: {
  id: string;
  ticketNumber: string;
  routeId: string;
  vehicleId: string;
  passengerName: string;
  passengerPhone?: string;
  seatNumber: number;
  departureDate: string;
  fareCents: number;
  serviceChargeCents: number;
  stationFeeCents: number;
  vatCents: number;
  totalCents: number;
  commissionCents: number;
  ticketerId: string;
  stationId: string;
  clientMutationId: string;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO local_tickets (
      id, ticket_number, route_id, vehicle_id, passenger_name, passenger_phone,
      seat_number, departure_date, fare_cents, service_charge_cents,
      station_fee_cents, vat_cents, total_cents, commission_cents,
      ticketer_id, station_id, client_mutation_id, issued_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      ticket.id,
      ticket.ticketNumber,
      ticket.routeId,
      ticket.vehicleId,
      ticket.passengerName,
      ticket.passengerPhone ?? null,
      ticket.seatNumber,
      ticket.departureDate,
      ticket.fareCents,
      ticket.serviceChargeCents,
      ticket.stationFeeCents,
      ticket.vatCents,
      ticket.totalCents,
      ticket.commissionCents,
      ticket.ticketerId,
      ticket.stationId,
      ticket.clientMutationId,
    ]
  );
}

export async function getPendingTickets(): Promise<
  Array<Record<string, unknown>>
> {
  const database = await getDb();
  return database.getAllAsync(
    "SELECT * FROM local_tickets WHERE sync_status = 'PENDING' ORDER BY created_at ASC"
  );
}

export async function getAllLocalTickets(limit = 50): Promise<
  Array<Record<string, unknown>>
> {
  const database = await getDb();
  return database.getAllAsync(
    "SELECT * FROM local_tickets ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
}

export async function markTicketSynced(clientMutationId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE local_tickets SET sync_status = 'SYNCED' WHERE client_mutation_id = ?",
    [clientMutationId]
  );
}

export async function markTicketFailed(
  clientMutationId: string,
  error: string
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE local_tickets SET sync_status = 'FAILED', sync_error = ? WHERE client_mutation_id = ?",
    [error, clientMutationId]
  );
}

// ── Sync queue operations ────────────────────────────────────

export async function addToSyncQueue(item: {
  id: string;
  table: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
}): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO sync_queue (id, table_name, operation, payload)
     VALUES (?, ?, ?, ?)`,
    [item.id, item.table, item.operation, JSON.stringify(item.payload)]
  );
}

export async function getSyncQueue(): Promise<
  Array<{ id: string; table_name: string; operation: string; payload: string }>
> {
  const database = await getDb();
  return database.getAllAsync(
    "SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 100"
  );
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
}

export async function incrementRetry(id: string, error: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?",
    [error, id]
  );
}

// ── Cache operations ─────────────────────────────────────────

export async function cacheData(
  table: "cached_stations" | "cached_routes" | "cached_vehicles",
  items: Array<{ id: string; data: unknown }>
): Promise<void> {
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    for (const item of items) {
      await database.runAsync(
        `INSERT OR REPLACE INTO ${table} (id, data, cached_at) VALUES (?, ?, datetime('now'))`,
        [item.id, JSON.stringify(item.data)]
      );
    }
  });
}

export async function getCachedData(
  table: "cached_stations" | "cached_routes" | "cached_vehicles"
): Promise<Array<{ id: string; data: string }>> {
  const database = await getDb();
  return database.getAllAsync(`SELECT id, data FROM ${table}`);
}

// ── Seat operations ──────────────────────────────────────────

export async function reserveSeat(
  vehicleId: string,
  departureDate: string,
  seatNumber: number,
  ticketId: string
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO seat_reservations
     (vehicle_id, departure_date, seat_number, ticket_id)
     VALUES (?, ?, ?, ?)`,
    [vehicleId, departureDate, seatNumber, ticketId]
  );
}

export async function getReservedSeats(
  vehicleId: string,
  departureDate: string
): Promise<number[]> {
  const database = await getDb();
  const results = await database.getAllAsync<{ seat_number: number }>(
    "SELECT seat_number FROM seat_reservations WHERE vehicle_id = ? AND departure_date = ?",
    [vehicleId, departureDate]
  );
  return results.map((r) => r.seat_number);
}

// ── Stats ────────────────────────────────────────────────────

export async function getSyncStats(): Promise<{
  pending: number;
  failed: number;
  synced: number;
}> {
  const database = await getDb();
  const [pending, failed, synced] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM local_tickets WHERE sync_status = 'PENDING'"
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM local_tickets WHERE sync_status = 'FAILED'"
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM local_tickets WHERE sync_status = 'SYNCED'"
    ),
  ]);

  return {
    pending: pending?.count ?? 0,
    failed: failed?.count ?? 0,
    synced: synced?.count ?? 0,
  };
}
