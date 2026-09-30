import { describe, it, expect } from "vitest";
import { generateTicketReceipt, type PrintTicketData } from "./escpos";

describe("mobile ESC/POS printing", () => {
  const mockTicket: PrintTicketData = {
    ticketNumber: "TKT-123456",
    passengerName: "Abebe Kebede",
    seatNumber: 12,
    departureDate: "2026-09-30",
    departureTime: "08:30 AM",
    route: {
      origin: "Addis Ababa",
      destination: "Hawassa",
      distanceKm: 275,
    },
    vehicle: {
      plateNumber: "3-AA-1234",
      type: "BUS",
    },
    fare: {
      baseFareCents: 20000,
      serviceChargeCents: 800,
      vatCents: 120,
      stationFeeCents: 80,
      totalCents: 21000,
      commissionCents: 40,
    },
    station: {
      name: "Central Terminal",
      code: "CT-01",
    },
    ticketer: {
      name: "Almaz T.",
    },
    issuedAt: "2026-09-30T07:15:00Z",
  };

  it("generates non-empty ESC/POS byte array", () => {
    const bytes = generateTicketReceipt(mockTicket, 58);
    expect(bytes).toBeInstanceOf(Array);
    expect(bytes.length).toBeGreaterThan(50);
  });

  it("starts with ESC @ (INIT command)", () => {
    const bytes = generateTicketReceipt(mockTicket, 58);
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it("includes ticket number and passenger in bytes", () => {
    const bytes = generateTicketReceipt(mockTicket, 58);
    const textOutput = String.fromCharCode(...bytes);
    expect(textOutput).toContain("TKT-123456");
    expect(textOutput).toContain("Abebe Kebede");
    expect(textOutput).toContain("Addis Ababa");
    expect(textOutput).toContain("Hawassa");
  });
});
