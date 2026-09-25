# Money Calculation

## Package: `@e-ticket/money`

Location: `packages/money/`

## Why integer cents?

Floating point causes rounding errors:

```javascript
0.1 + 0.2 === 0.30000000000000004; // true
```

For financial calculations, we use integer cents (1 ETB = 100 cents):

```typescript
// 63.75 ETB = 6375 cents
const totalCents = 6375;
```

## Fare breakdown calculation

```typescript
interface FareInput {
  fareCents: number; // Base fare in cents
  distanceKm: number; // Trip distance
}

interface FareBreakdown {
  fareCents: number;
  serviceChargeCents: number;
  stationFeeCents: number;
  vatCents: number;
  totalCents: number;
  commissionCents: number;
  netPlatformRevenueCents: number;
}
```

### Algorithm

```typescript
function calcFareBreakdown(input: FareInput): FareBreakdown {
  // 1. Determine SC rate based on distance
  const scRate = input.distanceKm <= 50 ? 0.05 : 0.04;

  // 2. Calculate each component (round half-up)
  const serviceChargeCents = Math.round(input.fareCents * scRate);
  const vatCents = Math.round(serviceChargeCents * 0.15);
  const stationFeeCents = Math.round(serviceChargeCents * 0.1);
  const commissionCents = Math.round(serviceChargeCents * 0.05);

  // 3. Sum for total
  const totalCents =
    input.fareCents + serviceChargeCents + vatCents + stationFeeCents;

  // 4. Platform keeps what's left
  const netPlatformRevenueCents =
    serviceChargeCents - stationFeeCents - commissionCents;

  return {/* ... */};
}
```

## Test cases

```typescript
// Test 1: Short trip (≤50km)
const result = calcFareBreakdown({ fareCents: 6000, distanceKm: 45 });
// serviceChargeCents: 300 (60 × 5%)
// vatCents: 45 (3 × 15%)
// stationFeeCents: 30 (3 × 10%)
// totalCents: 6375 (60 + 3 + 0.45 + 0.30)
// commissionCents: 15 (3 × 5%)
// netPlatformRevenueCents: 255 (300 - 30 - 15)

// Test 2: Long trip (>50km)
const result = calcFareBreakdown({ fareCents: 20000, distanceKm: 120 });
// serviceChargeCents: 800 (200 × 4%)
// vatCents: 120 (8 × 15%)
// stationFeeCents: 80 (8 × 10%)
// totalCents: 21000 (200 + 8 + 1.2 + 0.8)
// commissionCents: 40 (8 × 5%)
// netPlatformRevenueCents: 680 (800 - 80 - 40)
```

## Utility functions

```typescript
// Format for display
formatCents(6375); // "63.75"
formatCents(6000); // "60.00"
formatCents(45); // "0.45"

// Parse from string
parseToCents("63.75"); // 6375
parseToCents("60"); // 6000
parseToCents("abc"); // throws Error
```

## Commission calculation

```typescript
// Ticketer gets 5% of SC per ticket
calcCommission(300); // 15 cents (0.15 ETB)

// Weekly withdrawal
calcWeeklyWithdrawal(weeklyCommission, alreadyWithdrawn);
// Returns { availableCents, canWithdraw }
```
