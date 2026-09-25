import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const ticketsTable = pgTable("transit_tickets", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distanceKm: numeric("distance_km", {
    precision: 9,
    scale: 2,
    mode: "number",
  }).notNull(),
  fareETB: numeric("fare_etb", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  serviceChargeRate: numeric("service_charge_rate", {
    precision: 4,
    scale: 3,
    mode: "number",
  }).notNull(),
  serviceChargeETB: numeric("service_charge_etb", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  vatETB: numeric("vat_etb", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  stationFeeETB: numeric("station_fee_etb", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  totalETB: numeric("total_etb", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  ticketerCommissionETB: numeric("ticketer_commission_etb", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  vehiclePlate: text("vehicle_plate").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TicketRecord = typeof ticketsTable.$inferSelect;
