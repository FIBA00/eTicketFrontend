import { authFetch } from "./auth";
import {
  getQueue,
  removeFromQueue,
  incrementRetry,
  getPendingMutations,
  isOnline,
  onOnlineChange,
  type QueuedMutation,
} from "./offline-queue";

const MAX_RETRIES = 5;
let syncInProgress = false;
let syncListeners: Array<(result: SyncResult) => void> = [];

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export function onSyncComplete(
  listener: (result: SyncResult) => void,
): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(result: SyncResult): void {
  syncListeners.forEach((l) => l(result));
}

export async function syncNow(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (syncInProgress) {
    return {
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: ["Sync already in progress"],
    };
  }

  if (!isOnline()) {
    return { synced: 0, failed: 0, conflicts: 0, errors: ["Offline"] };
  }

  syncInProgress = true;

  const result: SyncResult = {
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    const mutations = getPendingMutations();

    if (mutations.length === 0) {
      return result;
    }

    // Push mutations in batches of 50
    const batchSize = 50;
    for (let i = 0; i < mutations.length; i += batchSize) {
      const batch = mutations.slice(i, i + batchSize);

      try {
        const res = await authFetch("/sync/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mutations: batch.map((m) => ({
              id: m.id,
              table: m.table,
              operation: m.operation,
              payload: m.payload,
              baseVersion: m.baseVersion,
              stationId: "", // Server gets from auth
              deviceId: "web",
              createdAt: m.createdAt,
            })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error?.message ?? `Sync failed (${res.status})`,
          );
        }

        const data = (await res.json()) as {
          applied: Array<{ clientMutationId: string }>;
          conflicts: Array<{ clientMutationId: string; reason: string }>;
          rejected: Array<{ clientMutationId: string; reason: string }>;
        };

        // Handle results
        for (const applied of data.applied) {
          removeFromQueue(applied.clientMutationId);
          result.synced++;
        }

        for (const conflict of data.conflicts) {
          removeFromQueue(conflict.clientMutationId);
          result.conflicts++;
          result.errors.push(`Conflict: ${conflict.reason}`);
        }

        for (const rejected of data.rejected) {
          removeFromQueue(rejected.clientMutationId);
          result.failed++;
          result.errors.push(`Rejected: ${rejected.reason}`);
        }
      } catch (err) {
        // Network or server error — increment retry for all in batch
        const message = err instanceof Error ? err.message : "Sync failed";
        for (const mutation of batch) {
          const retries = incrementRetry(mutation.id, message);
          if (retries >= MAX_RETRIES) {
            removeFromQueue(mutation.id);
            result.failed++;
            result.errors.push(
              `Max retries: ${mutation.table}/${mutation.operation}`,
            );
          }
        }
      }
    }

    // Pull updates after successful push
    await pullUpdates();

    notifyListeners(result);
    return result;
  } finally {
    syncInProgress = false;
  }
}

async function pullUpdates(): Promise<void> {
  try {
    const res = await authFetch("/sync/pull?since=0&limit=100");
    if (!res.ok) return;

    const data = (await res.json()) as {
      mutations: Array<{
        id: string;
        table: string;
        operation: string;
        payload: Record<string, unknown>;
      }>;
      currentVersion: number;
    };

    // Invalidate relevant queries to refetch fresh data
    // TanStack Query will handle the refetch
    window.dispatchEvent(new CustomEvent("sync:pull", { detail: data }));
  } catch {
    // Pull is best-effort
  }
}

// Auto-sync when coming online
let autoSyncInitialized = false;

export function initAutoSync(): () => void {
  if (autoSyncInitialized) return () => {};
  autoSyncInitialized = true;

  const unsubscribe = onOnlineChange(async (online) => {
    if (online) {
      // Small delay to let connection stabilize
      setTimeout(() => syncNow(), 1000);
    }
  });

  // Also sync periodically (every 5 minutes)
  const interval = setInterval(
    () => {
      if (isOnline() && getQueue().length > 0) {
        syncNow();
      }
    },
    5 * 60 * 1000,
  );

  return () => {
    unsubscribe();
    clearInterval(interval);
    autoSyncInitialized = false;
  };
}

// Queue a ticket issue for offline sync
export function queueTicketIssue(ticketData: {
  routeId: string;
  vehicleId: string;
  passengerName: string;
  passengerPhone?: string;
  seatNumber: number;
  departureDate: string;
  ticketerId: string;
  stationId: string;
}): string {
  const { addToQueue, generateMutationId } = require("./offline-queue");
  const mutationId = generateMutationId();

  addToQueue({
    id: mutationId,
    table: "tickets",
    operation: "CREATE",
    payload: {
      ...ticketData,
      clientMutationId: mutationId,
    },
    baseVersion: 0,
  });

  return mutationId;
}

// Get sync status for UI
export async function getSyncStatus(): Promise<{
  queueLength: number;
  serverStatus?: {
    pending: number;
    applied: number;
    conflicts: number;
    rejected: number;
  };
}> {
  const queueLength = getQueue().length;

  let serverStatus;
  if (isOnline()) {
    try {
      const res = await authFetch("/sync/status");
      if (res.ok) {
        serverStatus = await res.json();
      }
    } catch {
      // Server status is optional
    }
  }

  return { queueLength, serverStatus };
}
