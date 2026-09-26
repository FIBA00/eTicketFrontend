import { useQuery } from "@tanstack/react-query";

// ! internal imports
import { authFetch } from "../lib/auth.ts";
import {StationSummary, DisplayVehicle, StationDisplay} from "../lib/shared/types/api.types.ts";

export function useStationDisplay(stationId: string | null) {
  return useQuery({
    queryKey: ["display", stationId],
    queryFn: async () => {
      const url = stationId
        ? `/display/station/${stationId}`
        : "/display/my-station";
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch display data");
      return res.json() as Promise<StationDisplay>;
    },
    enabled: !!stationId || stationId === null, // Allow null for my-station
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAllStationsDisplay() {
  return useQuery({
    queryKey: ["display", "stations"],
    queryFn: async () => {
      const res = await authFetch("/display/stations");
      if (!res.ok) throw new Error("Failed to fetch stations");
      return res.json() as Promise<StationSummary[]>;
    },
    refetchInterval: 60000,
  });
}

// Public display (no auth) — for TV screens
export function usePublicStationDisplay(stationId: string) {
  return useQuery({
    queryKey: ["publicDisplay", stationId],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/v1/display/station/${stationId}`);
      if (!res.ok) throw new Error("Failed to fetch display");
      return res.json() as Promise<StationDisplay>;
    },
    refetchInterval: 15000, // Faster refresh for public display
    retry: 3,
  });
}
