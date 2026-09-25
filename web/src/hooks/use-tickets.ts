import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  ticketNumber: string;
  routeId: string;
  vehicleId: string;
  driverName: string | null;
  passengerName: string;
  passengerPhone: string | null;
  departureDate: string;
  status: "ISSUED" | "VOID" | "REFUNDED";
  fareCents: number;
  serviceChargeCents: number;
  stationFeeCents: number;
  vatCents: number;
  totalCents: number;
  commissionCents: number;
  qrHash: string | null;
  batchId: string | null;
  batchSequence: number | null;
  ticketerId: string;
  stationId: string;
  clientMutationId: string | null;
  issuedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  version: number;
}

export interface BatchResult {
  batchId: string;
  quantity: number;
  tickets: Ticket[];
}

export interface BatchSummary {
  batchId: string;
  totalTickets: number;
  soldTickets: number;
  voidTickets: number;
  totalRevenueCents: number;
  tickets: Ticket[];
}

export interface VerifyResult {
  valid: boolean;
  ticket?: Ticket;
  message?: string;
}

export interface IssueTicketInput {
  routeId: string;
  vehicleId: string;
  driverName?: string;
  passengerName?: string;
  passengerPhone?: string;
  departureDate: string;
  clientMutationId?: string;
}

export interface IssueBatchInput {
  routeId: string;
  vehicleId: string;
  driverName: string;
  quantity: number;
  departureDate: string;
}

// ── Queries ──────────────────────────────────────────────────

export function useTickets(filters?: {
  status?: string;
  date?: string;
  batchId?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.date) params.set("date", filters.date);
  if (filters?.batchId) params.set("batchId", filters.batchId);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());

  const qs = params.toString();
  const url = `/tickets${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json() as Promise<Ticket[]>;
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: async () => {
      const res = await authFetch(`/tickets/${id}`);
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return res.json() as Promise<Ticket>;
    },
    enabled: !!id,
  });
}

export function useBatchSummary(batchId: string | null) {
  return useQuery({
    queryKey: ["batch", batchId],
    queryFn: async () => {
      const res = await authFetch(`/tickets/batch/${batchId}`);
      if (!res.ok) throw new Error("Failed to fetch batch");
      return res.json() as Promise<BatchSummary>;
    },
    enabled: !!batchId,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useIssueTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: IssueTicketInput) => {
      const res = await authFetch("/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to issue ticket");
      }
      return res.json() as Promise<Ticket>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useIssueBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: IssueBatchInput) => {
      const res = await authFetch("/tickets/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to issue batch");
      }
      return res.json() as Promise<BatchResult>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["batch", data.batchId] });
    },
  });
}

export function useVoidTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(`/tickets/${id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to void ticket");
      }
      return res.json() as Promise<Ticket>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["batch"] });
    },
  });
}

// ── Verification ─────────────────────────────────────────────

export async function verifyTicket(
  ticketNumber: string,
  qrHash: string
): Promise<VerifyResult> {
  const res = await authFetch(
    `/tickets/verify/${ticketNumber}?hash=${encodeURIComponent(qrHash)}`
  );
  if (!res.ok) {
    return { valid: false, message: "Verification failed" };
  }
  return res.json();
}
