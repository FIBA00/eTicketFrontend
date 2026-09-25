// Shared types — copied from web app
// Keep in sync with backend v2 API

export interface Station {
  id: string;
  name: string;
  code: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: "BUS" | "MINIBUS" | "COASTER";
  capacity: number;
  agentId: string;
  stationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Route {
  id: string;
  originStationId: string;
  destinationStationId: string;
  distanceKm: number;
  baseFareCents: number;
  estimatedMinutes: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  originStation?: { id: string; name: string; code: string; city: string };
  destinationStation?: { id: string; name: string; code: string; city: string };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  routeId: string;
  vehicleId: string;
  passengerName: string;
  passengerPhone: string | null;
  seatNumber: number;
  departureDate: string;
  status: "ISSUED" | "VOID" | "REFUNDED";
  fareCents: number;
  serviceChargeCents: number;
  stationFeeCents: number;
  vatCents: number;
  totalCents: number;
  commissionCents: number;
  ticketerId: string;
  stationId: string;
  clientMutationId: string | null;
  issuedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  version: number;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  role: "SYSTEM_ADMIN" | "AGENT" | "TICKETER" | "STATION_CONTROLLER";
  stationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// Local SQLite types (offline)
export interface LocalTicket extends Ticket {
  syncStatus: "PENDING" | "SYNCED" | "FAILED" | "CONFLICT";
  syncError?: string;
}

export interface SyncQueueItem {
  id: string;              // UUID
  table: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  baseVersion: number;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}
