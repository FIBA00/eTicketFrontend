// Web Bluetooth printing for thermal printers
// Uses Web Bluetooth API — supported in Chrome/Edge

import type { PrinterConfig, PrinterStatus, PrintTicketData } from "./types";
import { generateTicketReceipt } from "./escpos";

// Type declarations for Web Bluetooth
interface BluetoothDevice {
  name?: string;
  gatt?: {
    connect(): Promise<BluetoothRemoteGATTServer>;
  };
  addEventListener(type: string, listener: () => void): void;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>;
}

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: {
        filters: Array<{ services?: string[]; namePrefix?: string }>;
        optionalServices?: string[];
      }): Promise<BluetoothDevice>;
    };
  }
}

// Standard Bluetooth UUIDs for printers
const PRINTER_SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb"; // Common printer service
const PRINTER_CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb"; // Write characteristic

export class WebBluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async isSupported(): Promise<boolean> {
    return "bluetooth" in navigator;
  }

  async connect(): Promise<PrinterStatus> {
    if (!navigator.bluetooth) {
      return {
        connected: false,
        error: "Web Bluetooth not supported. Use Chrome or Edge.",
      };
    }

    try {
      // Request printer device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PRINTER_SERVICE_UUID] },
          { namePrefix: "Printer" },
          { namePrefix: "POS" },
          { namePrefix: "Thermal" },
        ],
        optionalServices: [PRINTER_SERVICE_UUID],
      });

      if (!this.device.gatt) {
        return { connected: false, error: "Device does not support GATT" };
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Get printer service
      const service = await this.server.getPrimaryService(PRINTER_SERVICE_UUID);

      // Get write characteristic
      this.characteristic = await service.getCharacteristic(
        PRINTER_CHARACTERISTIC_UUID,
      );

      // Handle disconnect
      this.device.addEventListener("gattserverdisconnected", () => {
        this.disconnect();
      });

      return {
        connected: true,
        type: "bluetooth",
        name: this.device.name ?? "Unknown Printer",
      };
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }

  async print(data: PrintTicketData, width: 58 | 80 = 58): Promise<boolean> {
    if (!this.characteristic) {
      throw new Error("Printer not connected");
    }

    const bytes = generateTicketReceipt(data, width);

    // Write in chunks (Bluetooth has MTU limits, usually 512 bytes)
    const CHUNK_SIZE = 512;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      await this.characteristic.writeValue(chunk);

      // Small delay between chunks to prevent buffer overflow
      if (i + CHUNK_SIZE < bytes.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return true;
  }

  disconnect(): void {
    if (this.server) {
      this.server.disconnect();
      this.server = null;
    }
    this.device = null;
    this.characteristic = null;
  }

  isConnected(): boolean {
    return this.characteristic !== null;
  }
}

// Singleton instance
export const webBluetoothPrinter = new WebBluetoothPrinter();
