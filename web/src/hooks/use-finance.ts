import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────

export interface DailyAudit {
  stationId: string;
  date: string;
  totalTickets: number;
  totalFareCents: number;
  totalServiceChargeCents: number;
  totalStationFeeCents: number;
  totalVatCents: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
  netRevenueCents: number;
}

export interface Commission {
  totalCommissionCents: number;
  ticketCount: number;
  alreadyWithdrawnCents: number;
  availableCents: number;
  startDate: string;
  endDate: string;
}

export interface Withdrawal {
  id: string;
  amountCents: number;
  weekStartDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  requestedAt: string;
  processedAt: string | null;
}

export interface RevenueReport {
  totalTickets: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
  totalStationFeeCents: number;
  totalVatCents: number;
  netRevenueCents: number;
  dailyBreakdown: Array<{
    date: string;
    tickets: number;
    revenueCents: number;
  }>;
  startDate: string;
  endDate: string;
}

// ── Queries ──────────────────────────────────────────────────

export function useDailyAudit(date?: string) {
  const dateParam = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["dailyAudit", dateParam],
    queryFn: async () => {
      const res = await authFetch(`/finance/daily-audit?date=${dateParam}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch audit");
      return res.json() as Promise<DailyAudit>;
    },
  });
}

export function useGenerateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await authFetch("/finance/daily-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to generate audit");
      }
      return res.json() as Promise<DailyAudit>;
    },
    onSuccess: (_data, date) => {
      qc.invalidateQueries({ queryKey: ["dailyAudit", date] });
      qc.invalidateQueries({ queryKey: ["auditHistory"] });
    },
  });
}

export function useAuditHistory(limit = 30) {
  return useQuery({
    queryKey: ["auditHistory", limit],
    queryFn: async () => {
      const res = await authFetch(`/finance/audit-history?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<DailyAudit[]>;
    },
  });
}

export function useCommission(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  return useQuery({
    queryKey: ["commission", startDate, endDate],
    queryFn: async () => {
      const res = await authFetch(`/finance/commission?${params}`);
      if (!res.ok) throw new Error("Failed to fetch commission");
      return res.json() as Promise<Commission>;
    },
  });
}

export function useWithdrawalHistory(limit = 20) {
  return useQuery({
    queryKey: ["withdrawalHistory", limit],
    queryFn: async () => {
      const res = await authFetch(`/finance/withdrawal?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      return res.json() as Promise<Withdrawal[]>;
    },
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amountCents: number; weekStartDate: string }) => {
      const res = await authFetch("/finance/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to request withdrawal");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawalHistory"] });
      qc.invalidateQueries({ queryKey: ["commission"] });
    },
  });
}

export function useRevenueReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  return useQuery({
    queryKey: ["revenue", startDate, endDate],
    queryFn: async () => {
      const res = await authFetch(`/finance/revenue?${params}`);
      if (!res.ok) throw new Error("Failed to fetch revenue");
      return res.json() as Promise<RevenueReport>;
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}
