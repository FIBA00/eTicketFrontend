// ESC/POS generator for React Native
// Same output as web version

export interface PrintTicketData {
  ticketNumber: string;
  passengerName: string;
  passengerPhone?: string;
  seatNumber: number;
  departureDate: string;
  departureTime: string;
  route: { origin: string; destination: string; distanceKm: number };
  vehicle: { plateNumber: string; type: string };
  fare: {
    baseFareCents: number;
    serviceChargeCents: number;
    vatCents: number;
    stationFeeCents: number;
    totalCents: number;
    commissionCents: number;
  };
  station: { name: string; code: string };
  ticketer: { name: string };
  issuedAt: string;
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_HEIGHT_OFF: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x00],
  FEED: [ESC, 0x64],
} as const;

function formatCents(cents: number): string {
  const birr = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${birr}.${remainder.toString().padStart(2, "0")}`;
}

export function generateTicketReceipt(data: PrintTicketData, width: 58 | 80 = 58): number[] {
  const bytes: number[] = [];

  const text = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
  };

  const cmd = (c: readonly number[]) => bytes.push(...c);
  const newline = () => bytes.push(LF);

  const lineWidth = width === 58 ? 32 : 48;
  const divider = "-".repeat(lineWidth);

  cmd(CMD.INIT);

  // Header
  cmd(CMD.ALIGN_CENTER);
  cmd(CMD.BOLD_ON);
  cmd(CMD.DOUBLE_HEIGHT_ON);
  text(data.station.name.toUpperCase());
  cmd(CMD.DOUBLE_HEIGHT_OFF);
  newline();
  cmd(CMD.BOLD_OFF);
  text(`Code: ${data.station.code}`);
  newline();
  newline();

  // Ticket info
  cmd(CMD.ALIGN_LEFT);
  text(`Ticket: ${data.ticketNumber}`);
  newline();
  text(`Date: ${new Date(data.issuedAt).toLocaleDateString()}`);
  newline();
  newline();

  // Route
  cmd(CMD.ALIGN_CENTER);
  cmd(CMD.BOLD_ON);
  text(`${data.route.origin} → ${data.route.destination}`);
  cmd(CMD.BOLD_OFF);
  newline();
  text(`${data.route.distanceKm} km`);
  newline();
  newline();

  // Details
  cmd(CMD.ALIGN_LEFT);
  text(`Passenger: ${data.passengerName}`);
  newline();
  text(`Vehicle: ${data.vehicle.plateNumber}`);
  newline();
  text(`Seat: ${data.seatNumber}`);
  newline();
  text(`Departure: ${new Date(data.departureDate).toLocaleDateString()}`);
  newline();
  newline();

  text(divider);
  newline();

  // Fare
  const printLine = (label: string, amount: string) => {
    const spaces = lineWidth - label.length - amount.length - 1;
    text(label + " ".repeat(Math.max(1, spaces)) + amount);
    newline();
  };

  printLine("Base fare:", formatCents(data.fare.baseFareCents));
  printLine("Service charge:", formatCents(data.fare.serviceChargeCents));
  printLine("VAT:", formatCents(data.fare.vatCents));
  printLine("Station fee:", formatCents(data.fare.stationFeeCents));

  text(divider);
  newline();

  cmd(CMD.BOLD_ON);
  printLine("TOTAL:", `${formatCents(data.fare.totalCents)} ETB`);
  cmd(CMD.BOLD_OFF);

  newline();
  newline();
  cmd(CMD.FEED);
  bytes.push(3);
  cmd(CMD.CUT);

  return bytes;
}
