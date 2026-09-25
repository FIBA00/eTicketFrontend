// Unified print manager — chooses best printing method

import type { PrintTicketData, PrinterConfig, PrinterStatus } from "./types";
import { webBluetoothPrinter } from "./web-bluetooth";
import { printReceipt as browserPrint } from "./web-print";

export type PrintMethod = "bluetooth" | "browser";

export class PrintManager {
  private method: PrintMethod = "browser";
  private config: PrinterConfig | null = null;

  async detectBestMethod(): Promise<PrintMethod> {
    // Check Web Bluetooth support
    if (await webBluetoothPrinter.isSupported()) {
      return "bluetooth";
    }

    // Fall back to browser print
    return "browser";
  }

  async connect(method?: PrintMethod): Promise<PrinterStatus> {
    this.method = method ?? (await this.detectBestMethod());

    if (this.method === "bluetooth") {
      const status = await webBluetoothPrinter.connect();
      if (status.connected) {
        this.config = {
          type: "bluetooth",
          name: status.name,
          width: 58,
        };
      }
      return status;
    }

    // Browser print always "connected"
    return {
      connected: true,
      type: "usb",
      name: "Browser Print",
    };
  }

  async print(data: PrintTicketData): Promise<boolean> {
    if (this.method === "bluetooth" && webBluetoothPrinter.isConnected()) {
      return webBluetoothPrinter.print(data, this.config?.width ?? 58);
    }

    // Browser print
    browserPrint(data);
    return true;
  }

  disconnect(): void {
    if (this.method === "bluetooth") {
      webBluetoothPrinter.disconnect();
    }
  }

  getMethod(): PrintMethod {
    return this.method;
  }

  isConnected(): boolean {
    if (this.method === "bluetooth") {
      return webBluetoothPrinter.isConnected();
    }
    return true; // Browser print always available
  }
}

// Singleton
export const printManager = new PrintManager();

// Re-export types and utilities
export * from "./types";
export { generateTicketReceipt, generateDailySummary } from "./escpos";
export { isBluetoothSupported } from "./web-print";
