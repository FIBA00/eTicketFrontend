import { useState, useMemo } from "react";
import { Send, FileCheck, Printer, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { useVehicles, useRoutes, type Vehicle } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { formatCents } from "@/lib/money-utils";

export interface LoadingPermit {
  id: string;
  permitNumber: string;
  vehicleId: string;
  plateNumber: string;
  routeId: string;
  routeTitle: string;
  driverName: string;
  cargoFeeETB: number;
  stationFeeVerified: boolean;
  issuedAt: string;
  status: "PERMITTED" | "DISPATCHED";
}

const STORAGE_KEY = "eticket_loading_permits";

function loadPermits(): LoadingPermit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePermits(permits: LoadingPermit[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permits));
}

export default function DispatchPage() {
  const { user } = useAuth();
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const { data: routes } = useRoutes();

  const [permits, setPermits] = useState<LoadingPermit[]>(loadPermits);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewPermit, setViewPermit] = useState<LoadingPermit | null>(null);

  // Form state
  const [vehicleId, setVehicleId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [cargoFee, setCargoFee] = useState("0");
  const [stationFeeVerified, setStationFeeVerified] = useState(true);
  const [error, setError] = useState("");

  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);
  const selectedRoute = routes?.find((r) => r.id === routeId);

  const activePermits = useMemo(
    () => permits.filter((p) => p.status === "PERMITTED"),
    [permits]
  );

  function handleCreatePermit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId || !routeId || !driverName.trim()) {
      setError("Please fill all required fields");
      return;
    }

    const newPermit: LoadingPermit = {
      id: `PMT-${Date.now()}`,
      permitNumber: `LP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      vehicleId,
      plateNumber: selectedVehicle?.plateNumber ?? "Unknown",
      routeId,
      routeTitle: `${selectedRoute?.originStation?.name ?? "?"} → ${selectedRoute?.destinationStation?.name ?? "?"}`,
      driverName: driverName.trim(),
      cargoFeeETB: parseFloat(cargoFee) || 0,
      stationFeeVerified,
      issuedAt: new Date().toISOString(),
      status: "PERMITTED",
    };

    const updated = [newPermit, ...permits];
    setPermits(updated);
    savePermits(updated);
    setDialogOpen(false);
    setViewPermit(newPermit);

    // Reset form
    setVehicleId("");
    setRouteId("");
    setDriverName("");
    setCargoFee("0");
    setError("");
  }

  function handleDispatch(permitId: string) {
    const updated = permits.map((p) =>
      p.id === permitId ? { ...p, status: "DISPATCHED" as const } : p
    );
    setPermits(updated);
    savePermits(updated);
  }

  const columns = [
    {
      key: "permitNumber",
      header: "Permit #",
      render: (p: LoadingPermit) => (
        <span className="font-mono text-xs font-semibold">{p.permitNumber}</span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle Plate",
      render: (p: LoadingPermit) => (
        <span className="font-medium">{p.plateNumber}</span>
      ),
    },
    {
      key: "route",
      header: "Authorized Route",
      render: (p: LoadingPermit) => p.routeTitle,
    },
    {
      key: "driver",
      header: "Driver",
      render: (p: LoadingPermit) => p.driverName,
    },
    {
      key: "cargo",
      header: "Cargo Fee",
      render: (p: LoadingPermit) => `${p.cargoFeeETB.toFixed(2)} ETB`,
    },
    {
      key: "status",
      header: "Status",
      render: (p: LoadingPermit) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            p.status === "DISPATCHED"
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {p.status === "DISPATCHED" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {p.status === "DISPATCHED" ? "Dispatched" : "Loading"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p: LoadingPermit) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewPermit(p)}
          >
            <FileCheck className="mr-1 h-3.5 w-3.5" />
            Permit
          </Button>
          {p.status === "PERMITTED" && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleDispatch(p.id)}
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Dispatch
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicle Dispatch</h1>
          <p className="text-muted-foreground">
            Driver Association terminal queue management and official loading permits
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <FileCheck className="mr-2 h-4 w-4" />
          Issue Loading Permit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Queue Size</p>
          <p className="mt-1 text-2xl font-bold">{vehicles?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Active Loading Permits</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{activePermits.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Dispatched</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {permits.filter((p) => p.status === "DISPATCHED").length}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={permits}
        isLoading={loadingVehicles}
        emptyMessage="No loading permits issued yet. Click 'Issue Loading Permit' to authorize a vehicle."
      />

      {/* Issue Permit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreatePermit}>
            <DialogHeader>
              <DialogTitle>Issue Loading Permit</DialogTitle>
              <DialogDescription>
                Authorize an affiliated vehicle to load passengers and verify terminal fees.
              </DialogDescription>
            </DialogHeader>

            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vehicle">Affiliated Vehicle *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plateNumber} ({v.type} - {v.capacity} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="route">Designated Route *</Label>
                <Select value={routeId} onValueChange={setRouteId}>
                  <SelectTrigger id="route">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.originStation?.name ?? "?"} → {r.destinationStation?.name ?? "?"} (
                        {r.distanceKm} km)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="driver">Driver Name *</Label>
                <Input
                  id="driver"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver full name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cargo">Cargo Charge (ETB)</Label>
                <Input
                  id="cargo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cargoFee}
                  onChange={(e) => setCargoFee(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="stationFee"
                  checked={stationFeeVerified}
                  onChange={(e) => setStationFeeVerified(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="stationFee" className="cursor-pointer">
                  Confirm station fee and cargo charge verified
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Issue Permit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permit Inspection & Print Dialog */}
      <Dialog open={!!viewPermit} onOpenChange={() => setViewPermit(null)}>
        <DialogContent className="max-w-md">
          {viewPermit && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-center font-mono">
                  OFFICIAL LOADING PERMIT
                </DialogTitle>
                <DialogDescription className="text-center">
                  Public Transport Drivers' Association Authority
                </DialogDescription>
              </DialogHeader>

              <div className="border rounded-md p-4 space-y-2 font-mono text-sm bg-muted/30">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Permit No:</span>
                  <span className="font-bold">{viewPermit.permitNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle Plate:</span>
                  <span className="font-bold">{viewPermit.plateNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route:</span>
                  <span>{viewPermit.routeTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver:</span>
                  <span>{viewPermit.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo Charge:</span>
                  <span>{viewPermit.cargoFeeETB.toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Station Fee:</span>
                  <span className="text-emerald-600 font-semibold">VERIFIED & PAID</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>Issued At:</span>
                  <span>{new Date(viewPermit.issuedAt).toLocaleString()}</span>
                </div>
              </div>

              <DialogFooter className="flex-row justify-between sm:justify-between">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Permit
                </Button>
                <Button onClick={() => setViewPermit(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
