import { twMerge } from "tailwind-merge";

import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ROUTES: RouteOption[] = [
  {
    id: "RT-014",
    name: "Addis Ababa → Adama",
    origin: "Addis Ababa",
    destination: "Adama",
    distanceKm: 99,
    fareETB: 125,
  },
  {
    id: "RT-021",
    name: "Addis Ababa → Debre Zeit",
    origin: "Addis Ababa",
    destination: "Debre Zeit",
    distanceKm: 45,
    fareETB: 72,
  },
  {
    id: "RT-033",
    name: "Adama → Dire Dawa",
    origin: "Adama",
    destination: "Dire Dawa",
    distanceKm: 453,
    fareETB: 480,
  },
  {
    id: "RT-041",
    name: "Bahir Dar → Gondar",
    origin: "Bahir Dar",
    destination: "Gondar",
    distanceKm: 180,
    fareETB: 220,
  },
  {
    id: "RT-008",
    name: "Hawassa → Shashemene",
    origin: "Hawassa",
    destination: "Shashemene",
    distanceKm: 27,
    fareETB: 48,
  },
];

export const VEHICLES = [
  { plate: "3-AB-4901", operator: "Yonas M." },
  { plate: "4-AA-2107", operator: "Hanna K." },
  { plate: "3-OR-7714", operator: "Abel T." },
  { plate: "2-BA-3088", operator: "Mulugeta G." },
];

export const QUEUE_KEY = "transit-eticket-queue";
export const AUTO_SYNC_KEY = "transit-eticket-auto-sync";
export const STATION_NAME = "Addis Ababa Central";
export const STATION_CODE = "ST-AA";

export function readQueue(): TicketInput[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as TicketInput[]) : [];
  } catch {
    return [];
  }
}

export function writeQueue(queue: TicketInput[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("transit-queue-changed"));
}

export function queueTicket(ticket: TicketInput) {
  const queue = readQueue();
  if (!queue.some((item) => item.id === ticket.id)) {
    writeQueue([...queue, ticket]);
  }
}

export function isAutoSyncEnabled() {
  return (
    typeof window === "undefined" ||
    window.localStorage.getItem(AUTO_SYNC_KEY) !== "false"
  );
}

export function currency(value: number | undefined | null) {
  return `ETB ${(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The station service could not be reached.";
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useQueueCount() {
  const [count, setCount] = useState(() =>
    typeof window === "undefined" ? 0 : readQueue().length,
  );
  useEffect(() => {
    const update = () => setCount(readQueue().length);
    window.addEventListener("transit-queue-changed", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("transit-queue-changed", update);
      window.removeEventListener("online", update);
    };
  }, []);
  return count;
}

export function useLocalQueue() {
  const [queue, setQueue] = useState<TicketInput[]>(() =>
    typeof window === "undefined" ? [] : readQueue(),
  );
  useEffect(() => {
    const update = () => setQueue(readQueue());
    window.addEventListener("transit-queue-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("transit-queue-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return queue;
}

export function useOfflineSync(online: boolean, queueCount: number) {
  const queryClient = useQueryClient();
  const createTicket = useCreateTicket();
  const mutateAsyncRef = useRef(createTicket.mutateAsync);
  const syncingRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [enabled, setEnabled] = useState(isAutoSyncEnabled);
  mutateAsyncRef.current = createTicket.mutateAsync;
  useEffect(() => {
    const update = () => setEnabled(isAutoSyncEnabled());
    window.addEventListener("transit-settings-changed", update);
    return () => window.removeEventListener("transit-settings-changed", update);
  }, []);
  const sync = useCallback(
    async (manual = false) => {
      if (
        !online ||
        (!enabled && !manual) ||
        syncingRef.current ||
        queueCount === 0
      )
        return;
      const queue = readQueue();
      if (!queue.length) return;
      syncingRef.current = true;
      setSyncing(true);
      setSyncError(false);
      let failed = false;
      for (const ticket of queue) {
        try {
          await mutateAsyncRef.current({ data: ticket });
          const remaining = readQueue().filter((item) => item.id !== ticket.id);
          writeQueue(remaining);
        } catch {
          failed = true;
          break;
        }
      }
      await queryClient.invalidateQueries({
        queryKey: getGetTicketsQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetTicketSummaryQueryKey(),
      });
      syncingRef.current = false;
      setSyncing(false);
      setSyncError(failed);
    },
    [enabled, online, queryClient, queueCount],
  );
  useEffect(() => {
    void sync();
  }, [sync]);
  return { syncing, syncError, syncNow: () => sync(true) };
}

export function makeTicket(
  route: RouteOption,
  vehiclePlate: string,
): TicketInput {
  const serviceChargeRate = route.distanceKm < 50 ? 0.05 : 0.04;
  const serviceChargeETB = Number(
    (route.fareETB * serviceChargeRate).toFixed(2),
  );
  const vatETB = Number((serviceChargeETB * 0.15).toFixed(2));
  const stationFeeETB = Number((serviceChargeETB * 0.1).toFixed(2));
  const ticketerCommissionETB = Number((serviceChargeETB * 0.05).toFixed(2));
  const totalETB = Number(
    (route.fareETB + serviceChargeETB + vatETB + stationFeeETB).toFixed(2),
  );
  return {
    id: `TKT-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    routeId: route.id,
    origin: route.origin,
    destination: route.destination,
    distanceKm: route.distanceKm,
    fareETB: route.fareETB,
    serviceChargeRate,
    serviceChargeETB,
    vatETB,
    stationFeeETB,
    totalETB,
    ticketerCommissionETB,
    vehiclePlate,
    issuedAt: new Date().toISOString(),
  };
}
