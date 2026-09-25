// Money formatting utilities for display
// Backend stores integer cents, we format for UI

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
