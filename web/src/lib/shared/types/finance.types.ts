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
