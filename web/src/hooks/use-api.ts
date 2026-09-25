import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";

// ── Types (matching backend v2) ──────────────────────────────

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

// ── Stations API ─────────────────────────────────────────────

export function useStations() {
  return useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      const res = await authFetch("/stations");
      if (!res.ok) throw new Error("Failed to fetch stations");
      return res.json() as Promise<Station[]>;
    },
  });
}

export function useCreateStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<Station, "id" | "createdAt" | "updatedAt" | "isActive">,
    ) => {
      const res = await authFetch("/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to create station");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stations"] }),
  });
}

export function useUpdateStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Station> & { id: string }) => {
      const res = await authFetch(`/stations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to update station");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stations"] }),
  });
}

export function useDeleteStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/stations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete station");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stations"] }),
  });
}

// ── Vehicles API ─────────────────────────────────────────────

export function useVehicles(stationId?: string) {
  return useQuery({
    queryKey: ["vehicles", stationId],
    queryFn: async () => {
      const url = stationId ? `/vehicles?stationId=${stationId}` : "/vehicles";
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json() as Promise<Vehicle[]>;
    },
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      plateNumber: string;
      type: string;
      capacity: number;
      agentId: string;
      stationId: string;
    }) => {
      const res = await authFetch("/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to create vehicle");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vehicle> & { id: string }) => {
      const res = await authFetch(`/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to update vehicle");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

// ── Routes API ───────────────────────────────────────────────

export function useRoutes(originStationId?: string) {
  return useQuery({
    queryKey: ["routes", originStationId],
    queryFn: async () => {
      const url = originStationId
        ? `/routes?originStationId=${originStationId}`
        : "/routes";
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json() as Promise<Route[]>;
    },
  });
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      originStationId: string;
      destinationStationId: string;
      distanceKm: number;
      baseFareCents: number;
      estimatedMinutes?: number;
    }) => {
      const res = await authFetch("/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to create route");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useUpdateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Route> & { id: string }) => {
      const res = await authFetch(`/routes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to update route");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/routes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete route");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routes"] }),
  });
}

// ── Users API ────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await authFetch("/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<User[]>;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      fullName: string;
      phone?: string;
      role: string;
      stationId?: string;
    }) => {
      const res = await authFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<User> & { id: string }) => {
      const res = await authFetch(`/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
