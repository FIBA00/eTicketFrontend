import { describe, it, expect, vi } from "vitest";
import {
  bluetoothPrinter,
  printTicket,
  printBatch,
  type PrintTicketData,
} from "./bluetooth";

describe("mobile thermal printer", () => {
  const mockTicket: PrintTicketData = {
    ticketNumber: "TKT-999888",
    passengerName: "Tigist Haile",
    seatNumber: 4,
    departureDate: "2026-09-30",
    departureTime: "09:00 AM",
    route: {
      origin: "Addis Ababa",
      destination: "Bahir Dar",
      distanceKm: 560,
    },
    vehicle: {
      plateNumber: "3-AA-9988",
      type: "MINIBUS",
    },
    fare: {
      baseFareCents: 45000,
      serviceChargeCents: 1800,
      vatCents: 270,
      stationFeeCents: 100,
      totalCents: 47170,
      commissionCents: 90,
    },
    station: {
      name: "Autobis Tera",
      code: "ABT-01",
    },
    ticketer: {
      name: "Dawit K.",
    },
    issuedAt: "2026-09-30T08:00:00Z",
  };

  it("detects fallback device type in non-native test environment", () => {
    expect(bluetoothPrinter.getDeviceType()).toBe("fallback");
  });

  it("connects and sets connected status", async () => {
    const connected = await bluetoothPrinter.connect();
    expect(connected).toBe(true);
    expect(bluetoothPrinter.isConnected()).toBe(true);
  });

  it("prints single ticket using receipt generator", async () => {
    const success = await printTicket(mockTicket);
    expect(success).toBe(true);
  });

  it("prints batch tickets and returns count", async () => {
    const batch = [mockTicket, { ...mockTicket, ticketNumber: "TKT-999889" }];
    const res = await printBatch(batch);
    expect(res.success).toBe(true);
    expect(res.printed).toBe(2);
  });

  it("disconnects cleanly", async () => {
    await bluetoothPrinter.disconnect();
    expect(bluetoothPrinter.isConnected()).toBe(false);
  });
});
