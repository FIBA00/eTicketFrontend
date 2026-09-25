// Offline queue for web app
// Uses localStorage — same pattern as mobile's SQLite queue

export interface QueuedMutation {
  id: string;              // UUID (clientMutationId)
  table: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  baseVersion: number;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const QUEUE_KEY = "eticket_sync_queue";
const MAX_RETRIES = 5;

export function getQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedMutation[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(mutation: Omit<QueuedMutation, "createdAt" | "retryCount">): void {
  const queue = getQueue();
  queue.push({
    ...mutation,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  saveQueue(queue);
}

export function removeFromQueue(id: string): void {
  const queue = getQueue();
  const filtered = queue.filter((m) => m.id !== id);
  saveQueue(filtered);
}

export function incrementRetry(id: string, error: string): number {
  const queue = getQueue();
  const mutation = queue.find((m) => m.id === id);
  if (mutation) {
    mutation.retryCount += 1;
    mutation.lastError = error;
    saveQueue(queue);
    return mutation.retryCount;
  }
  return 0;
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export function getPendingMutations(): QueuedMutation[] {
  return getQueue().filter((m) => m.retryCount < MAX_RETRIES);
}

// Generate UUID for clientMutationId
export function generateMutationId(): string {
  return crypto.randomUUID();
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen to online/offline events
export function onOnlineChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
