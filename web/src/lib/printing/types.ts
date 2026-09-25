// Printing types — shared between web and mobile

export interface PrintTicketData {
  ticketNumber: string;
  passengerName: string;
  passengerPhone?: string;
  seatNumber: number;
  departureDate: string;
  departureTime: string;

  route: {
    origin: string;
    destination: string;
    distanceKm: number;
  };

  vehicle: {
    plateNumber: string;
    type: string;
  };

  fare: {
    baseFareCents: number;
    serviceChargeCents: number;
    vatCents: number;
    stationFeeCents: number;
    totalCents: number;
    commissionCents: number;
  };

  station: {
    name: string;
    code: string;
  };

  ticketer: {
    name: string;
  };

  issuedAt: string;
}

export type PrinterType = "bluetooth" | "usb" | "network" | "sunmi";

export interface PrinterConfig {
  type: PrinterType;
  name?: string;
  address?: string; // MAC for Bluetooth, IP for network
  width: 58 | 80; // mm
}

export interface PrinterStatus {
  connected: boolean;
  type?: PrinterType;
  name?: string;
  error?: string;
}
