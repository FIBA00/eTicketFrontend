import { useState } from "react";
import {
  Printer,
  Bluetooth,
  Chrome,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  printManager,
  type PrintMethod,
  type PrinterStatus,
} from "@/lib/printing";
import { isBluetoothSupported } from "@/lib/printing/web-print";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (method: PrintMethod) => Promise<boolean>;
  ticketNumber?: string;
}

export function PrintDialog({
  open,
  onOpenChange,
  onPrint,
  ticketNumber,
}: PrintDialogProps) {
  const [method, setMethod] = useState<PrintMethod>("browser");
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState("");

  const bluetoothSupported = isBluetoothSupported();

  async function handleConnect() {
    setIsConnecting(true);
    setError("");

    try {
      const result = await printManager.connect(method);
      setStatus(result);

      if (!result.connected) {
        setError(result.error ?? "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handlePrint() {
    setIsPrinting(true);
    setError("");

    try {
      const success = await onPrint(method);
      if (success) {
        onOpenChange(false);
      } else {
        setError("Print failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Print failed");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Ticket {ticketNumber && `#${ticketNumber}`}
          </DialogTitle>
          <DialogDescription>Choose how to print this ticket</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Method selection */}
          <RadioGroup
            value={method}
            onValueChange={(v) => setMethod(v as PrintMethod)}
          >
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="browser" id="browser" />
              <Label htmlFor="browser" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Chrome className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Browser Print</p>
                    <p className="text-sm text-muted-foreground">
                      Use system print dialog (any printer)
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            <div
              className={`flex items-center space-x-2 rounded-md border p-3 ${!bluetoothSupported ? "opacity-50" : ""}`}
            >
              <RadioGroupItem
                value="bluetooth"
                id="bluetooth"
                disabled={!bluetoothSupported}
              />
              <Label
                htmlFor="bluetooth"
                className={`flex-1 ${!bluetoothSupported ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  <Bluetooth className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Bluetooth Printer</p>
                    <p className="text-sm text-muted-foreground">
                      {bluetoothSupported
                        ? "Direct to thermal printer"
                        : "Not supported in this browser"}
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Connection status */}
          {method === "bluetooth" && (
            <div className="rounded-md bg-muted p-3">
              {status?.connected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Connected to {status.name}</span>
                </div>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {isConnecting ? "Connecting..." : "Connect to Printer"}
                </Button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={
              isPrinting || (method === "bluetooth" && !status?.connected)
            }
          >
            {isPrinting ? "Printing..." : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
