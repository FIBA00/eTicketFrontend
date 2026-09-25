// ESC/POS command generator for thermal printers
// Industry standard for receipt printing

import type { PrintTicketData } from "./types";

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  // Initialize
  INIT: [ESC, 0x40],

  // Alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Text formatting
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_HEIGHT_OFF: [GS, 0x21, 0x00],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  DOUBLE_WIDTH_OFF: [GS, 0x21, 0x00],

  // Paper
  CUT: [GS, 0x56, 0x00],
  FEED: [ESC, 0x64], // + n lines

  // Character set
  CHARSET: [ESC, 0x52, 0x08], // PC858 for ETB symbol support

  // QR Code
  QR_MODEL: [GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], // Model 2
  QR_SIZE: [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x08], // Size 8
  QR_ERROR: [GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31], // EC level M
} as const;

function formatCents(cents: number): string {
  const birr = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${birr}.${remainder.toString().padStart(2, "0")}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addQrCode(bytes: number[], data: string) {
  // QR code data length
  const len = data.length + 3;
  const pL = len % 256;
  const pH = Math.floor(len / 256);

  // Store QR data
  bytes.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i));
  }

  // Print QR
  bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
}

export function generateTicketReceipt(
  data: PrintTicketData,
  width: 58 | 80 = 58,
): Uint8Array {
  const bytes: number[] = [];

  // Helper to add text
  const text = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  };

  const cmd = (command: readonly number[]) => {
    bytes.push(...command);
  };

  const newline = () => {
    bytes.push(LF);
  };

  // Line width based on paper size
  const lineWidth = width === 58 ? 32 : 48;
  const divider = "-".repeat(lineWidth);
  const equals = "=".repeat(lineWidth);

  // Initialize printer
  cmd(CMD.INIT);
  cmd(CMD.CHARSET);

  // Header — Centered, bold, double height
  cmd(CMD.ALIGN_CENTER);
  cmd(CMD.BOLD_ON);
  cmd(CMD.DOUBLE_HEIGHT_ON);
  text(data.station.name.toUpperCase());
  cmd(CMD.DOUBLE_HEIGHT_OFF);
  newline();
  cmd(CMD.BOLD_OFF);

  text(`Station Code: ${data.station.code}`);
  newline();
  newline();

  // Ticket info
  cmd(CMD.ALIGN_LEFT);
  text(`Ticket: ${data.ticketNumber}`);
  newline();
  text(
    `Date: ${formatDate(data.issuedAt)}  Time: ${formatTime(data.issuedAt)}`,
  );
  newline();
  newline();

  // Route — Centered, bold
  cmd(CMD.ALIGN_CENTER);
  cmd(CMD.BOLD_ON);
  text(`${data.route.origin} → ${data.route.destination}`);
  cmd(CMD.BOLD_OFF);
  newline();
  text(`${data.route.distanceKm} km`);
  newline();
  newline();

  // Passenger details
  cmd(CMD.ALIGN_LEFT);
  if (data.driverName) {
    text(`Driver: ${data.driverName}`);
    newline();
  }
  text(`Passenger: ${data.passengerName}`);
  newline();
  if (data.passengerPhone) {
    text(`Phone: ${data.passengerPhone}`);
    newline();
  }
  text(`Vehicle: ${data.vehicle.plateNumber} (${data.vehicle.type})`);
  newline();
  if (data.batchSequence) {
    text(`Ticket #${data.batchSequence} in batch`);
    newline();
  }
  text(
    `Departure: ${formatDate(data.departureDate)} ${formatTime(data.departureTime)}`,
  );
  newline();
  newline();

  // Divider
  text(divider);
  newline();

  // Fare breakdown — right aligned amounts
  const printLine = (label: string, amount: string) => {
    const spaces = lineWidth - label.length - amount.length - 1;
    text(label + " ".repeat(Math.max(1, spaces)) + amount);
    newline();
  };

  printLine("Base fare:", `${formatCents(data.fare.baseFareCents)}`);
  printLine("Service charge:", `${formatCents(data.fare.serviceChargeCents)}`);
  printLine("VAT (15%):", `${formatCents(data.fare.vatCents)}`);
  printLine("Station fee:", `${formatCents(data.fare.stationFeeCents)}`);

  text(divider);
  newline();

  // Total — bold, larger
  cmd(CMD.BOLD_ON);
  const totalLabel = "TOTAL:";
  const totalAmount = `${formatCents(data.fare.totalCents)} ETB`;
  const totalSpaces = lineWidth - totalLabel.length - totalAmount.length - 1;
  text(totalLabel + " ".repeat(Math.max(1, totalSpaces)) + totalAmount);
  cmd(CMD.BOLD_OFF);
  newline();

  text(equals);
  newline();
  newline();

  // Commission — small text
  printLine(
    "Ticketer commission:",
    `${formatCents(data.fare.commissionCents)}`,
  );
  text(`Served by: ${data.ticketer.name}`);
  newline();
  newline();

  // QR Code for verification
  if (data.qrHash) {
    cmd(CMD.ALIGN_CENTER);
    const qrData = `${data.ticketNumber}|${data.qrHash}`;
    addQrCode(bytes, qrData);
    newline();
    text("Scan to verify");
    newline();
    newline();
  }

  // Footer — centered
  cmd(CMD.ALIGN_CENTER);
  text("Thank you for traveling with us!");
  newline();
  text("Safe journey!");
  newline();
  newline();
  newline();

  // Cut paper
  cmd(CMD.FEED);
  bytes.push(3); // Feed 3 lines
  cmd(CMD.CUT);

  return new Uint8Array(bytes);
}

// Generate daily summary receipt
export function generateDailySummary(
  data: {
    date: string;
    stationName: string;
    totalTickets: number;
    totalRevenueCents: number;
    totalCommissionCents: number;
    netRevenueCents: number;
    tickets: Array<{
      ticketNumber: string;
      passengerName: string;
      totalCents: number;
    }>;
  },
  width: 58 | 80 = 58,
): Uint8Array {
  const bytes: number[] = [];

  const text = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  };

  const cmd = (command: readonly number[]) => bytes.push(...command);
  const newline = () => bytes.push(LF);

  const lineWidth = width === 58 ? 32 : 48;
  const divider = "-".repeat(lineWidth);

  cmd(CMD.INIT);
  cmd(CMD.CHARSET);

  // Header
  cmd(CMD.ALIGN_CENTER);
  cmd(CMD.BOLD_ON);
  cmd(CMD.DOUBLE_HEIGHT_ON);
  text("DAILY SUMMARY");
  cmd(CMD.DOUBLE_HEIGHT_OFF);
  newline();
  text(data.stationName.toUpperCase());
  cmd(CMD.BOLD_OFF);
  newline();
  text(formatDate(data.date));
  newline();
  newline();

  // Summary
  cmd(CMD.ALIGN_LEFT);
  text(`Total Tickets: ${data.totalTickets}`);
  newline();
  text(`Total Revenue: ${formatCents(data.totalRevenueCents)} ETB`);
  newline();
  text(`Commission Paid: ${formatCents(data.totalCommissionCents)} ETB`);
  newline();
  text(`Net Revenue: ${formatCents(data.netRevenueCents)} ETB`);
  newline();
  newline();

  text(divider);
  newline();

  // Ticket list
  cmd(CMD.BOLD_ON);
  text("TICKET DETAILS");
  cmd(CMD.BOLD_OFF);
  newline();
  text(divider);
  newline();

  data.tickets.forEach((ticket, i) => {
    text(`${i + 1}. ${ticket.ticketNumber}`);
    newline();
    text(`   ${ticket.passengerName}`);
    newline();
    text(`   ${formatCents(ticket.totalCents)} ETB`);
    newline();
  });

  newline();
  newline();
  cmd(CMD.FEED);
  bytes.push(3);
  cmd(CMD.CUT);

  return new Uint8Array(bytes);
}
