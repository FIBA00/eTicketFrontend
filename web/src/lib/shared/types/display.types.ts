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
  agent?: { id: string; fullName: string; username: string };
  station?: { id: string; name: string; code: string };
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

export interface DisplayVehicle {
  id: string;
  plateNumber: string;
  type: string;
  capacity: number;
  status: "ARRIVING" | "BOARDING" | "DEPARTED";
  route: {
    origin: string;
    destination: string;
    distanceKm: number;
  };
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
}

export interface StationDisplay {
  station: {
    id: string;
    name: string;
    code: string;
  };
  incoming: DisplayVehicle[];
  active: DisplayVehicle[];
  departed: DisplayVehicle[];
  lastUpdated: string;
}

export interface StationSummary {
  station: {
    id: string;
    name: string;
    code: string;
  };
  vehicleCount: number;
  lastUpdated: string;
}