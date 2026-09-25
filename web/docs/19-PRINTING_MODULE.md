# Printing Module (Week 8)

## Overview

Thermal printer integration for ticket receipts and daily summaries.

## Industry Standard: ESC/POS

ESC/POS is the industry standard command set for thermal receipt printers. Used by:

- Epson thermal printers
- Generic Bluetooth thermal printers (58mm, 80mm)
- POS systems (Sun Mi, etc.)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────►│  ESC/POS Gen    │────►│  Printer        │
│                 │     │  (Uint8Array)   │     │                 │
│ - Ticket data   │     │                 │     │ - Bluetooth     │
│ - Fare calc     │     │ - Text layout   │     │ - USB           │
│ - Formatting    │     │ - Commands      │     │ - Network       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Web Printing

### Methods

| Method            | Browser      | How                         |
| ----------------- | ------------ | --------------------------- |
| Web Bluetooth API | Chrome, Edge | Direct Bluetooth to printer |
| Browser Print     | All          | System print dialog         |

### Files

| File                                | Purpose                      |
| ----------------------------------- | ---------------------------- |
| `src/lib/printing/types.ts`         | Shared types                 |
| `src/lib/printing/escpos.ts`        | ESC/POS command generator    |
| `src/lib/printing/web-bluetooth.ts` | Web Bluetooth implementation |
| `src/lib/printing/web-print.ts`     | Browser print fallback       |
| `src/lib/printing/index.ts`         | Unified print manager        |
| `src/components/print-dialog.tsx`   | Print method selector dialog |
| `src/components/print-button.tsx`   | Reusable print button        |

### Usage

```tsx
import { PrintButton } from "@/components/print-button";

<PrintButton
  ticketData={{
    ticketNumber: "ET-2026-000001",
    passengerName: "Abebe Kebede",
    seatNumber: 5,
    departureDate: "2026-09-25",
    departureTime: "14:00",
    route: { origin: "Addis Ababa", destination: "Adama", distanceKm: 90 },
    vehicle: { plateNumber: "ET-12345", type: "BUS" },
    fare: {
      baseFareCents: 12500,
      serviceChargeCents: 500,
      vatCents: 75,
      stationFeeCents: 50,
      totalCents: 13125,
      commissionCents: 25,
    },
    station: { name: "Addis Ababa Central", code: "ADD" },
    ticketer: { name: "John Doe" },
    issuedAt: "2026-09-25T14:00:00Z",
  }}
/>;
```

## Mobile Printing

### Files

| File                        | Purpose                         |
| --------------------------- | ------------------------------- |
| `src/printing/escpos.ts`    | ESC/POS generator (same as web) |
| `src/printing/bluetooth.ts` | React Native Bluetooth wrapper  |

### Native Module Required

Add one of these to `package.json`:

```json
{
  "dependencies": {
    "react-native-bluetooth-escpos-printer": "^2.0.0",
    // OR
    "react-native-thermal-receipt-printer": "^1.2.0"
  }
}
```

Then implement in `bluetooth.ts`:

```typescript
import BluetoothEscposPrinter from "react-native-bluetooth-escpos-printer";

async connect(address: string) {
  await BluetoothEscposPrinter.connectPrinter(address);
  this.connected = true;
}

async print(data: number[]) {
  const text = String.fromCharCode(...data);
  await BluetoothEscposPrinter.printText(text);
}
```

## Receipt Format

Based on uploaded screenshot:

```
┌──────────────────────────────┐
│      STATION NAME            │
│      Code: XXX               │
│                              │
│ Ticket: ET-2026-000001       │
│ Date: 25/09/2026 14:00       │
│                              │
│   Origin → Destination       │
│   90 km                      │
│                              │
│ Passenger: Abebe Kebede      │
│ Vehicle: ET-12345 (BUS)      │
│ Seat: 5                      │
│ Departure: 25/09/2026 14:00  │
│                              │
│ ---------------------------  │
│ Base fare:           125.00  │
│ Service charge:        5.00  │
│ VAT:                   0.75  │
│ Station fee:           0.50  │
│ ---------------------------  │
│ TOTAL:              131.25   │
│ ===========================  │
│ Commission:            0.25  │
│ Served by: John Doe          │
│                              │
│   Thank you! Safe journey!   │
└──────────────────────────────┘
```

## Printer Compatibility

| Printer Type      | Connection     | Paper      |
| ----------------- | -------------- | ---------- |
| Generic Bluetooth | Bluetooth      | 58mm, 80mm |
| Sun Mi V2         | Built-in       | 58mm       |
| USB Thermal       | USB (web only) | 58mm, 80mm |
| Network Printer   | TCP/IP         | 80mm       |

## ESC/POS Commands Used

| Command | Hex   | Purpose                               |
| ------- | ----- | ------------------------------------- |
| ESC @   | 1B 40 | Initialize                            |
| ESC a   | 1B 61 | Alignment (0=left, 1=center, 2=right) |
| ESC E   | 1B 45 | Bold on/off                           |
| GS !    | 1D 21 | Double height/width                   |
| GS V    | 1D 56 | Cut paper                             |
| ESC d   | 1B 64 | Feed n lines                          |
| LF      | 0A    | Line feed                             |

## Future Enhancements

- QR code on ticket (for verification)
- Barcode printing
- Logo printing (store in printer memory)
- Multiple copy printing
- Print preview
- Printer status monitoring (paper out, etc.)
