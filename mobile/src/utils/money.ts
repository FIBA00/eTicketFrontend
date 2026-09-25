// Money utilities — copied from web app
// All amounts in integer cents (1 ETB = 100 cents)

export function formatCents(cents: number): string {
  const birr = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${birr}.${remainder.toString().padStart(2, "0")}`;
}

export function parseToCents(amount: string): number {
  const match = amount.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error(`Invalid amount: ${amount}`);
  const birr = parseInt(match[1], 10);
  const frac = match[2] ? parseInt(match[2].padEnd(2, "0"), 10) : 0;
  return birr * 100 + frac;
}

export function formatETB(cents: number): string {
  return `${formatCents(cents)} ETB`;
}

// Fare calculation — must match backend exactly
export interface FareBreakdown {
  fareCents: number;
  serviceChargeCents: number;
  stationFeeCents: number;
  vatCents: number;
  totalCents: number;
  commissionCents: number;
  netPlatformRevenueCents: number;
}

const SHORT_TRIP_THRESHOLD_KM = 50;
const SHORT_TRIP_SC_RATE = 0.05;
const LONG_TRIP_SC_RATE = 0.04;
const VAT_RATE = 0.15;
const STATION_FEE_RATE = 0.10;
const COMMISSION_RATE = 0.05;

export function calcFareBreakdown(input: {
  fareCents: number;
  distanceKm: number;
}): FareBreakdown {
  const scRate =
    input.distanceKm <= SHORT_TRIP_THRESHOLD_KM ? SHORT_TRIP_SC_RATE : LONG_TRIP_SC_RATE;

  const serviceChargeCents = Math.round(input.fareCents * scRate);
  const vatCents = Math.round(serviceChargeCents * VAT_RATE);
  const stationFeeCents = Math.round(serviceChargeCents * STATION_FEE_RATE);
  const commissionCents = Math.round(serviceChargeCents * COMMISSION_RATE);

  const totalCents = input.fareCents + serviceChargeCents + vatCents + stationFeeCents;
  const netPlatformRevenueCents = serviceChargeCents - stationFeeCents - commissionCents;

  return {
    fareCents: input.fareCents,
    serviceChargeCents,
    stationFeeCents,
    vatCents,
    totalCents,
    commissionCents,
    netPlatformRevenueCents,
  };
}
