// Unified mobile thermal printer interface
// Supports Sunmi V2 POS built-in printer, Bluetooth ESC/POS, and development fallback

import { Platform, PermissionsAndroid, NativeModules } from "react-native";
import { generateTicketReceipt, type PrintTicketData } from "./escpos";

export type PrinterType = "sunmi" | "bluetooth" | "fallback";

export interface BluetoothPrinter {
  connect(address?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  print(data: number[]): Promise<boolean>;
  isConnected(): boolean;
  getDeviceType(): PrinterType;
}

class MobilePrinterImpl implements BluetoothPrinter {
  private connected = false;
  private deviceType: PrinterType = "fallback";

  getDeviceType(): PrinterType {
    const modules = NativeModules as Record<string, any> | undefined;
    if (modules?.SunmiPrinter) return "sunmi";
    if (modules?.BluetoothEscposPrinter) return "bluetooth";
    return "fallback";
  }

  async connect(address?: string): Promise<boolean> {
    const type = this.getDeviceType();
    this.deviceType = type;

    if (type === "sunmi") {
      this.connected = true;
      return true;
    }

    if (type === "bluetooth") {
      if (Platform.OS === "android") {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }
      try {
        const modules = NativeModules as Record<string, any>;
        if (address && modules.BluetoothEscposPrinter?.connectPrinter) {
          await modules.BluetoothEscposPrinter.connectPrinter(address);
        }
        this.connected = true;
        return true;
      } catch (err) {
        console.warn("[PRINTER] Bluetooth connection failed, falling back to simulated output", err);
      }
    }

    // Hardware fallback / simulator
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async print(data: number[]): Promise<boolean> {
    const modules = NativeModules as Record<string, any> | undefined;

    if (this.deviceType === "sunmi" && modules?.SunmiPrinter?.printRawData) {
      await modules.SunmiPrinter.printRawData(data);
      return true;
    }

    if (this.deviceType === "bluetooth" && modules?.BluetoothEscposPrinter?.printRaw) {
      await modules.BluetoothEscposPrinter.printRaw(data);
      return true;
    }

    // Hardware fallback logging
    console.log(`[PRINTER:fallback] Simulated print of ${data.length} ESC/POS bytes`);
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    try {
      const perms = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ].filter(Boolean);

      if (perms.length === 0) return true;
      const res = await PermissionsAndroid.requestMultiple(perms);
      return Object.values(res).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return false;
    }
  }
}

export const bluetoothPrinter = new MobilePrinterImpl();

export async function printTicket(
  data: PrintTicketData,
  width: 58 | 80 = 58
): Promise<boolean> {
  const bytes = generateTicketReceipt(data, width);
  if (!bluetoothPrinter.isConnected()) {
    await bluetoothPrinter.connect();
  }
  return bluetoothPrinter.print(bytes);
}

export async function printBatch(
  tickets: PrintTicketData[],
  width: 58 | 80 = 58
): Promise<{ success: boolean; printed: number }> {
  let count = 0;
  for (const ticket of tickets) {
    const ok = await printTicket(ticket, width);
    if (ok) count++;
  }
  return { success: count === tickets.length, printed: count };
}

export { generateTicketReceipt, type PrintTicketData };
