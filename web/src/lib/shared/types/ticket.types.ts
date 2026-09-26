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