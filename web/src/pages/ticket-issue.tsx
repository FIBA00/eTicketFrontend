import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Bus,
  Loader2,
  Printer,
  Ticket as TicketIcon,
  Users,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoutes, useVehicles, useStations } from "@/hooks/use-api";
import { useIssueTicket, useIssueBatch } from "@/hooks/use-tickets";
import { useAuth } from "@/hooks/use-auth";
import { formatCents } from "@/lib/money-utils";
import { calcFareBreakdown } from "@e-ticket/money";
import { queueTicketIssue, syncNow } from "@/lib/sync-engine";
import { isOnline } from "@/lib/offline-queue";

import { generateMutationId } from "@/lib/offline-queue";

export default function TicketIssuePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Data fetching
  const { data: routes } = useRoutes();
  const { data: vehicles } = useVehicles(user?.stationId ?? undefined);

  // Form state
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [departureTime, setDepartureTime] = useState("14:00");
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [printMode, setPrintMode] = useState<"single" | "batch">("single");
  const [batchQuantity, setBatchQuantity] = useState("10");
  const [error, setError] = useState("");

  // Mutations
  const issueTicket = useIssueTicket();
  const issueBatch = useIssueBatch();

  // Derived data
  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);
  const selectedVehicle = vehicles?.find((v) => v.id === selectedVehicleId);

  // Fare calculation preview
  const farePreview = useMemo(() => {
    if (!selectedRoute) return null;
    return calcFareBreakdown({
      fareCents: selectedRoute.baseFareCents,
      distanceKm: selectedRoute.distanceKm,
    });
  }, [selectedRoute]);

  // Batch total
  const batchTotal = useMemo(() => {
    if (!farePreview || printMode !== "batch") return null;
    const qty = parseInt(batchQuantity, 10) || 0;
    return {
      quantity: qty,
      totalCents: farePreview.totalCents * qty,
    };
  }, [farePreview, printMode, batchQuantity]);

  async function handleIssueTicket() {
    if (!selectedRouteId || !selectedVehicleId || !driverName) {
      setError("Please fill all required fields");
      return;
    }

    if (!user?.stationId) {
      setError("No station assigned to your account");
      return;
    }

    setError("");

    const departureDateTime = new Date(`${departureDate}T${departureTime}`);

    // Try online first
    if (isOnline()) {
      try {
        if (printMode === "batch") {
          const quantity = parseInt(batchQuantity, 10);
          if (quantity < 1 || quantity > 100) {
            setError("Batch quantity must be 1-100");
            return;
          }

          const result = await issueBatch.mutateAsync({
            routeId: selectedRouteId,
            vehicleId: selectedVehicleId,
            driverName,
            quantity,
            departureDate: departureDateTime.toISOString(),
          });

          // Navigate to batch view
          setLocation(`/tickets/batch/${result.batchId}`);
          return;
        } else {
          const ticket = await issueTicket.mutateAsync({
            routeId: selectedRouteId,
            vehicleId: selectedVehicleId,
            driverName,
            passengerName: passengerName || "Walk-in",
            passengerPhone: passengerPhone || undefined,
            departureDate: departureDateTime.toISOString(),
            clientMutationId: generateMutationId(),
          });

          setLocation(`/tickets/${ticket.id}`);
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (!message.includes("fetch") && !message.includes("network")) {
          setError(message || "Failed to issue ticket");
          return;
        }
        // Fall through to offline
      }
    }

    // Offline — queue for later
    const clientMutationId = generateMutationId();
    queueTicketIssue({
      routeId: selectedRouteId,
      vehicleId: selectedVehicleId,
      driverName,
      passengerName: passengerName || "Walk-in",
      passengerPhone: passengerPhone || undefined,
      departureDate: departureDateTime.toISOString(),
      ticketerId: user.id,
      stationId: user.stationId,
    });

    alert(
      `Ticket queued for sync

` +
        `Vehicle: ${selectedVehicle?.plateNumber}
` +
        `Route: ${selectedRoute?.originStation?.name} → ${selectedRoute?.destinationStation?.name}
` +
        `Total: ${farePreview ? formatCents(farePreview.totalCents) : "?"} ETB

` +
        `Will sync when online.`,
    );

    // Reset form
    setPassengerName("");
    setPassengerPhone("");
  }

  const isSubmitting = issueTicket.isPending || issueBatch.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/ticketing")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Issue Ticket</h1>
          <p className="text-muted-foreground">Print ticket for passenger</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Vehicle & Route */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" />
                Vehicle & Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select
                    value={selectedVehicleId}
                    onValueChange={setSelectedVehicleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plateNumber} — {v.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">Driver Name *</Label>
                  <Input
                    id="driver"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver full name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Route *</Label>
                <Select
                  value={selectedRouteId}
                  onValueChange={setSelectedRouteId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes?.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.originStation?.name} →{" "}
                        {route.destinationStation?.name} ({route.distanceKm} km)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure Date *</Label>
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Time *</Label>
                  <Input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Print Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={printMode}
                onValueChange={(v) => setPrintMode(v as "single" | "batch")}
              >
                <div className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <TicketIcon className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Single Ticket</p>
                        <p className="text-sm text-muted-foreground">
                          Print one ticket for current passenger
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="batch" id="batch" />
                  <Label htmlFor="batch" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Batch Print</p>
                        <p className="text-sm text-muted-foreground">
                          Pre-print multiple tickets at once
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {printMode === "single" && (
                <div className="space-y-4 rounded-md bg-muted p-4">
                  <div className="space-y-2">
                    <Label htmlFor="passenger">Passenger Name (optional)</Label>
                    <Input
                      id="passenger"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder="Walk-in passenger"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="+251..."
                    />
                  </div>
                </div>
              )}

              {printMode === "batch" && (
                <div className="space-y-4 rounded-md bg-muted p-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Number of Tickets *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="100"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum 100 tickets per batch
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Fare Summary & Actions */}
        <div className="space-y-6">
          {/* Fare Summary */}
          {farePreview && (
            <Card>
              <CardHeader>
                <CardTitle>Fare Summary</CardTitle>
                {selectedRoute && (
                  <CardDescription>
                    {selectedRoute.originStation?.name} →{" "}
                    {selectedRoute.destinationStation?.name}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-mono">
                    {formatCents(farePreview.fareCents)} ETB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span className="font-mono">
                    {formatCents(farePreview.serviceChargeCents)} ETB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (15%)</span>
                  <span className="font-mono">
                    {formatCents(farePreview.vatCents)} ETB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Station Fee</span>
                  <span className="font-mono">
                    {formatCents(farePreview.stationFeeCents)} ETB
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total per Ticket</span>
                  <span className="font-mono text-lg">
                    {formatCents(farePreview.totalCents)} ETB
                  </span>
                </div>

                {batchTotal && (
                  <>
                    <Separator />
                    <div className="rounded-md bg-primary/10 p-3">
                      <div className="flex justify-between text-sm">
                        <span>Quantity</span>
                        <span>{batchTotal.quantity} tickets</span>
                      </div>
                      <div className="flex justify-between font-medium mt-1">
                        <span>Batch Total</span>
                        <span className="font-mono text-lg text-primary">
                          {formatCents(batchTotal.totalCents)} ETB
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ticketer Commission</span>
                  <span className="font-mono">
                    {formatCents(farePreview.commissionCents)} ETB
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleIssueTicket}
            disabled={
              isSubmitting ||
              !selectedRouteId ||
              !selectedVehicleId ||
              !driverName
            }
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {printMode === "batch"
                  ? "Printing Batch..."
                  : "Printing Ticket..."}
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                {printMode === "batch"
                  ? `Print ${batchQuantity} Tickets`
                  : "Print Ticket"}
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Ticket will be marked as PAID and ready to hand to passenger
          </p>
        </div>
      </div>
    </div>
  );
}
