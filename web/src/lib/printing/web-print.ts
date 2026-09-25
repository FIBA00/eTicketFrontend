// Browser print fallback — generates HTML receipt and opens print dialog
// Works with any printer that browser supports (USB, network, PDF)

import type { PrintTicketData } from "./types";

function formatCents(cents: number): string {
  const birr = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${birr}.${remainder.toString().padStart(2, "0")}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-GB");
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateReceiptHTML(data: PrintTicketData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket ${data.ticketNumber}</title>
  <style>
    @media print {
      @page { margin: 0; size: 58mm auto; }
      body { margin: 0; }
    }

    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 58mm;
      margin: 0 auto;
      padding: 4mm;
    }

    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .xlarge { font-size: 20px; }

    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
    }

    .total {
      font-weight: bold;
      font-size: 14px;
    }

    .route {
      font-size: 14px;
      font-weight: bold;
      margin: 8px 0;
    }

    .footer {
      margin-top: 16px;
      text-align: center;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="center bold xlarge">${data.station.name.toUpperCase()}</div>
  <div class="center">Station Code: ${data.station.code}</div>

  <div class="divider"></div>

  <!-- Ticket Info -->
  <div>Ticket: <span class="bold">${data.ticketNumber}</span></div>
  <div>Date: ${formatDate(data.issuedAt)} ${formatTime(data.issuedAt)}</div>

  <div class="divider"></div>

  <!-- Route -->
  <div class="center route">${data.route.origin} → ${data.route.destination}</div>
  <div class="center">${data.route.distanceKm} km</div>

  <div class="divider"></div>

  <!-- Passenger -->
  <div>Passenger: ${data.passengerName}</div>
  ${data.passengerPhone ? `<div>Phone: ${data.passengerPhone}</div>` : ""}
  <div>Vehicle: ${data.vehicle.plateNumber} (${data.vehicle.type})</div>
  <div>Seat: <span class="bold large">#${data.seatNumber}</span></div>
  <div>Departure: ${formatDate(data.departureDate)} ${formatTime(data.departureTime)}</div>

  <div class="divider"></div>

  <!-- Fare Breakdown -->
  <div class="row"><span>Base fare:</span><span>${formatCents(data.fare.baseFareCents)}</span></div>
  <div class="row"><span>Service charge:</span><span>${formatCents(data.fare.serviceChargeCents)}</span></div>
  <div class="row"><span>VAT (15%):</span><span>${formatCents(data.fare.vatCents)}</span></div>
  <div class="row"><span>Station fee:</span><span>${formatCents(data.fare.stationFeeCents)}</span></div>

  <div class="divider"></div>

  <!-- Total -->
  <div class="row total">
    <span>TOTAL:</span>
    <span>${formatCents(data.fare.totalCents)} ETB</span>
  </div>

  <div class="divider"></div>

  <!-- Commission -->
  <div class="row"><small>Ticketer commission:</small><small>${formatCents(data.fare.commissionCents)}</small></div>
  <div><small>Served by: ${data.ticketer.name}</small></div>

  <div class="footer">
    <div>Thank you for traveling with us!</div>
    <div>Safe journey!</div>
  </div>

  <script>
    // Auto-print when loaded
    window.onload = () => {
      window.print();
      // Optionally close after print
      // window.close();
    };
  </script>
</body>
</html>
  `.trim();
}

export function printReceipt(data: PrintTicketData): void {
  const html = generateReceiptHTML(data);

  // Open in new window for printing
  const printWindow = window.open("", "_blank", "width=400,height=600");

  if (!printWindow) {
    // Popup blocked — fallback to iframe
    printViaIframe(html);
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
}

function printViaIframe(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }

  // Cleanup after print
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}

// Check if Web Bluetooth is supported
export function isBluetoothSupported(): boolean {
  return "bluetooth" in navigator;
}
