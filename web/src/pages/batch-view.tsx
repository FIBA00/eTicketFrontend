import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download, Printer, Ticket as TicketIcon, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBatchSummary, useVoidTicket } from "@/hooks/use-tickets";
import { useRoutes, useVehicles } from "@/hooks/use-api";
import { formatCents } from "@/lib/money-utils";

export default function BatchViewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [, setLocation] = useLocation();

  const { data: batch, isLoading } = useBatchSummary(batchId ?? null);
  const { data: routes } = useRoutes();
  const { data: vehicles } = useVehicles();
  const voidTicket = useVoidTicket();

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidTicketId, setVoidTicketId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [error, setError] = useState("");

  const firstTicket = batch?.tickets[0];
  const route = routes?.find((r) => r.id === firstTicket?.routeId);
  const vehicle = vehicles?.find((v) => v.id === firstTicket?.vehicleId);

  async function handleVoidTicket() {
    if (!voidTicketId || !voidReason.trim()) {
      setError("Reason is required");
      return;
    }

    try {
      await voidTicket.mutateAsync({ id: voidTicketId, reason: voidReason });
      setVoidDialogOpen(false);
      setVoidReason("");
      setVoidTicketId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void ticket");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Batch not found</p>
        <Button onClick={() => setLocation("/tickets")}>Back to Tickets</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/tickets")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ticket Batch</h1>
            <p className="text-muted-foreground font-mono">{batch.batchId}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Summary
        </Button>
      </div>

      {/* Batch Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tickets</CardDescription>
            <CardTitle className="text-2xl">{batch.totalTickets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sold</CardDescription>
            <CardTitle className="text-2xl text-green-600">{batch.soldTickets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Void</CardDescription>
            <CardTitle className="text-2xl text-red-600">{batch.voidTickets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {formatCents(batch.totalRevenueCents)} ETB
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Route & Vehicle Info */}
      {route && vehicle && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="font-medium">
                  {route.originStation?.name} → {route.destinationStation?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">{vehicle.plateNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Driver</p>
                <p className="font-medium">{firstTicket?.driverName ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets in Batch</CardTitle>
          <CardDescription>
            Click on a ticket to view details or void
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">#</th>
                  <th className="p-3 text-left font-medium">Ticket Number</th>
                  <th className="p-3 text-left font-medium">Passenger</th>
                  <th className="p-3 text-left font-medium">Amount</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batch.tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/tickets/${ticket.id}`)}
                  >
                    <td className="p-3">{ticket.batchSequence}</td>
                    <td className="p-3 font-mono text-sm">{ticket.ticketNumber}</td>
                    <td className="p-3">{ticket.passengerName}</td>
                    <td className="p-3 font-mono">{formatCents(ticket.totalCents)} ETB</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          ticket.status === "ISSUED"
                            ? "default"
                            : ticket.status === "VOID"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {ticket.status === "ISSUED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVoidTicketId(ticket.id);
                            setVoidDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Void Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Ticket</DialogTitle>
            <DialogDescription>
              This will cancel the ticket. Unsold tickets can be voided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voidReason">Reason *</Label>
              <Input
                id="voidReason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Unsold, damaged, misprint"
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidTicket}
              disabled={voidTicket.isPending}
            >
              {voidTicket.isPending ? "Voiding..." : "Void Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
