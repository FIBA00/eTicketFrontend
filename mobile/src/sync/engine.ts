import * as Network from "expo-network";
import { api } from "@/api/client";
import {
  getSyncQueue,
  removeFromSyncQueue,
  incrementRetry,
  getPendingTickets,
  markTicketSynced,
  markTicketFailed,
  addToSyncQueue,
  cacheData,
  getCachedData,
} from "@/db/client";
import type { SyncQueueItem } from "@/types";

const MAX_RETRIES = 5;

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable === true;
}

export async function syncNow(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
}> {
  // Check network first
  const online = await isOnline();
  if (!online) {
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  const queue = await getSyncQueue();
  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload);
      const mutation = {
        id: item.id,
        table: item.table_name,
        operation: item.operation,
        payload,
        baseVersion: 0,
        createdAt: new Date().toISOString(),
      };

      // Push to server
      const result = await api.post<{
        applied: Array<{ clientMutationId: string }>;
        conflicts: Array<{ clientMutationId: string; reason: string }>;
        rejected: Array<{ clientMutationId: string; reason: string }>;
      }>("/sync/push", { mutations: [mutation] });

      // Handle result
      if (result.applied.length > 0) {
        await markTicketSynced(item.id);
        await removeFromSyncQueue(item.id);
        synced++;
      } else if (result.conflicts.length > 0) {
        await markTicketFailed(item.id, result.conflicts[0].reason);
        await removeFromSyncQueue(item.id);
        conflicts++;
      } else if (result.rejected.length > 0) {
        await markTicketFailed(item.id, result.rejected[0].reason);
        await removeFromSyncQueue(item.id);
        failed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      await incrementRetry(item.id, message);

      // Remove from queue after max retries
      const retryCount = await getRetryCount(item.id);
      if (retryCount >= MAX_RETRIES) {
        await markTicketFailed(item.id, `Max retries exceeded: ${message}`);
        await removeFromSyncQueue(item.id);
        failed++;
      }
    }
  }

  return { synced, failed, conflicts };
}

async function getRetryCount(id: string): Promise<number> {
  // This would need a DB query — simplified for now
  return 0;
}

export async function queueTicketIssue(ticket: {
  id: string;
  clientMutationId: string;
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
}): Promise<void> {
  await addToSyncQueue({
    id: ticket.clientMutationId,
    table: "tickets",
    operation: "CREATE",
    payload: ticket,
  });
}

export async function pullReferenceData(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  try {
    const [stations, routes, vehicles] = await Promise.all([
      api.get<Array<{ id: string }>>("/stations"),
      api.get<Array<{ id: string }>>("/routes"),
      api.get<Array<{ id: string }>>("/vehicles"),
    ]);

    await cacheData(
      "cached_stations",
      stations.map((s) => ({ id: s.id, data: s }))
    );
    await cacheData(
      "cached_routes",
      routes.map((r) => ({ id: r.id, data: r }))
    );
    await cacheData(
      "cached_vehicles",
      vehicles.map((v) => ({ id: v.id, data: v }))
    );
  } catch (err) {
    console.error("Failed to pull reference data:", err);
  }
}

export async function getOfflineData<T>(
  table: "cached_stations" | "cached_routes" | "cached_vehicles"
): Promise<T[]> {
  const cached = await getCachedData(table);
  return cached.map((c) => JSON.parse(c.data) as T);
}
