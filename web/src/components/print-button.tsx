import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintDialog } from "./print-dialog";
import {
  printManager,
  type PrintMethod,
  type PrintTicketData,
} from "@/lib/printing";

interface PrintButtonProps {
  ticketData: PrintTicketData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function PrintButton({
  ticketData,
  variant = "outline",
  size = "default",
}: PrintButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handlePrint(method: PrintMethod): Promise<boolean> {
    // If method changed, reconnect
    if (printManager.getMethod() !== method) {
      const status = await printManager.connect(method);
      if (!status.connected) {
        throw new Error(status.error ?? "Connection failed");
      }
    }

    return printManager.print(ticketData);
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setDialogOpen(true)}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>

      <PrintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onPrint={handlePrint}
        ticketNumber={ticketData.ticketNumber}
      />
    </>
  );
}
