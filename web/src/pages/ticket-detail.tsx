import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Bus,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Ticket as TicketIcon,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTicket, useVoidTicket } from "@/hooks/use-tickets";
import { useRoutes, useVehicles, useStations } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { PrintButton } from "@/components/print-button";
import type { PrintTicketData } from "@/lib/printing";
import { formatCents } from "@/lib/money-utils";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { hasRole } = useAuth();

  const { data: ticket, isLoading } = useTicket(id ?? "");
  const { data: routes } = useRoutes();
  const { data: vehicles } = useVehicles();
  const { data: stations } = useStations();
  const voidTicket = useVoidTicket();

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [error, setError] = useState("");

  const route = routes?.find((r) => r.id === ticket?.routeId);
  const vehicle = vehicles?.find((v) => v.id === ticket?.vehicleId);
  const originStation = stations?.find((s) => s.id === route?.originStationId);
  const destinationStation = stations?.find(
    (s) => s.id === route?.destinationStationId,
  );

  async function handleVoid() {
    if (!voidReason.trim()) {
      setError("Reason is required");
      return;
    }

    try {
      await voidTicket.mutateAsync({ id: id!, reason: voidReason });
      setVoidDialogOpen(false);
      setVoidReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void ticket");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button onClick={() => setLocation("/tickets")}>Back to Tickets</Button>
      </div>
    );
  }

  const isVoid = ticket.status === "VOID";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/tickets")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Ticket {ticket.ticketNumber}
              </h1>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  isVoid
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {ticket.status}
              </span>
            </div>
            <p className="text-muted-foreground">
              Issued {new Date(ticket.issuedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {ticket && route && vehicle && originStation && (
            <PrintButton
              ticketData={{
                ticketNumber: ticket.ticketNumber,
                passengerName: ticket.passengerName,
                passengerPhone: ticket.passengerPhone ?? undefined,
                seatNumber: ticket.seatNumber,
                departureDate: ticket.departureDate,
                departureTime: ticket.departureDate,
                route: {
                  origin: originStation.name,
                  destination: destinationStation?.name ?? "Unknown",
                  distanceKm: route.distanceKm,
                },
                vehicle: {
                  plateNumber: vehicle.plateNumber,
                  type: vehicle.type,
                },
                fare: {
                  baseFareCents: ticket.fareCents,
                  serviceChargeCents: ticket.serviceChargeCents,
                  vatCents: ticket.vatCents,
                  stationFeeCents: ticket.stationFeeCents,
                  totalCents: ticket.totalCents,
                  commissionCents: ticket.commissionCents,
                },
                station: {
                  name: originStation.name,
                  code: originStation.code,
                },
                ticketer: {
                  name: "Current User", // TODO: Get from auth
                },
                issuedAt: ticket.issuedAt,
              }}
            />
          )}
          {!isVoid &&
            hasRole("TICKETER", "SYSTEM_ADMIN", "STATION_CONTROLLER") && (
              <Button
                variant="destructive"
                onClick={() => setVoidDialogOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Void Ticket
              </Button>
            )}
        </div>
      </div>

      {/* Void banner */}
      {isVoid && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <XCircle className="h-5 w-5" />
            Ticket Voided
          </div>
          <p className="text-sm text-red-600 mt-1">
            Reason: {ticket.voidReason}
          </p>
          <p className="text-xs text-red-500 mt-1">
            Voided at{" "}
            {ticket.voidedAt ? new Date(ticket.voidedAt).toLocaleString() : "—"}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Journey details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-medium">{originStation?.name ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">To</p>
                <p className="font-medium">{destinationStation?.name ?? "—"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Bus className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">
                  {vehicle?.plateNumber ?? "—"} ({vehicle?.type ?? "—"})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Departure Date</p>
                <p className="font-medium">
                  {new Date(ticket.departureDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TicketIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Seat Number</p>
                <p className="font-medium text-lg">#{ticket.seatNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passenger + fare */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Passenger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{ticket.passengerName}</p>
              </div>
              {ticket.passengerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.passengerPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fare Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Fare</span>
                <span className="font-mono">
                  {formatCents(ticket.fareCents)} ETB
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Charge</span>
                <span className="font-mono">
                  {formatCents(ticket.serviceChargeCents)} ETB
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span className="font-mono">
                  {formatCents(ticket.vatCents)} ETB
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Station Fee</span>
                <span className="font-mono">
                  {formatCents(ticket.stationFeeCents)} ETB
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Paid</span>
                <span className="font-mono text-lg">
                  {formatCents(ticket.totalCents)} ETB
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ticketer Commission</span>
                <span className="font-mono">
                  {formatCents(ticket.commissionCents)} ETB
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Void dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Ticket</DialogTitle>
            <DialogDescription>
              This will cancel ticket {ticket.ticketNumber}. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voidReason">Reason *</Label>
              <Input
                id="voidReason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Passenger cancelled, wrong seat, etc."
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
              onClick={handleVoid}
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
