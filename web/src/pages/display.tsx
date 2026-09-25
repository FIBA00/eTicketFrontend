import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Clock, MapPin, RefreshCw, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useStationDisplay,
  useAllStationsDisplay,
  type DisplayVehicle,
} from "@/hooks/use-display";
import { useStations } from "@/hooks/use-api";

export default function DisplayPage() {
  const params = useParams<{ stationId?: string }>();
  const [selectedStationId, setSelectedStationId] = useState<string>(
    params.stationId ?? ""
  );

  const { data: stations } = useStations();
  const { data: stationsSummary } = useAllStationsDisplay();
  const { data: display, isLoading, refetch, isRefetching } = useStationDisplay(
    selectedStationId || null
  );

  // Auto-select first station if none selected
  useEffect(() => {
    if (!selectedStationId && stations?.length) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BOARDING": return "bg-green-500";
      case "ARRIVING": return "bg-blue-500";
      case "DEPARTED": return "bg-gray-400";
      default: return "bg-gray-300";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BOARDING": return <Badge className="bg-green-500">Boarding</Badge>;
      case "ARRIVING": return <Badge className="bg-blue-500">Arriving</Badge>;
      case "DEPARTED": return <Badge variant="secondary">Departed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Station Display Board</h1>
          <p className="text-muted-foreground">
            Real-time vehicle departures and arrivals
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedStationId} onValueChange={setSelectedStationId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select station" />
            </SelectTrigger>
            <SelectContent>
              {stations?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Station Info */}
      {display && (
        <div className="mb-6 rounded-lg bg-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{display.station.name}</h2>
              <p className="opacity-90">Code: {display.station.code}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-75">Last Updated</p>
              <p className="font-mono">
                {new Date(display.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {/* Display Sections */}
      {display && (
        <div className="space-y-6">
          {/* Now Boarding */}
          <DisplaySection
            title="Now Boarding"
            icon="🚌"
            vehicles={display.active}
            emptyMessage="No vehicles currently boarding"
            getStatusBadge={getStatusBadge}
            getStatusColor={getStatusColor}
            highlight
          />

          {/* Arriving Soon */}
          <DisplaySection
            title="Arriving Soon"
            icon="⏰"
            vehicles={display.incoming}
            emptyMessage="No vehicles arriving in the next 30 minutes"
            getStatusBadge={getStatusBadge}
            getStatusColor={getStatusColor}
          />

          {/* Recently Departed */}
          <DisplaySection
            title="Recently Departed"
            icon="✓"
            vehicles={display.departed}
            emptyMessage="No recent departures"
            getStatusBadge={getStatusBadge}
            getStatusColor={getStatusColor}
            compact
          />
        </div>
      )}

      {/* All Stations Summary */}
      {stationsSummary && stationsSummary.length > 1 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">All Stations Activity</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {stationsSummary.map((s) => (
              <Card
                key={s.station.id}
                className={`cursor-pointer transition-colors ${
                  selectedStationId === s.station.id
                    ? "ring-2 ring-primary"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedStationId(s.station.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.station.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{s.vehicleCount}</span>
                    <span className="text-sm text-muted-foreground">vehicles today</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────

function DisplaySection({
  title,
  icon,
  vehicles,
  emptyMessage,
  getStatusBadge,
  getStatusColor,
  highlight = false,
  compact = false,
}: {
  title: string;
  icon: string;
  vehicles: DisplayVehicle[];
  emptyMessage: string;
  getStatusBadge: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  highlight?: boolean;
  compact?: boolean;
}) {
  if (vehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{icon}</span> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={highlight ? "border-green-500 border-2" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{icon}</span> {title}
          <Badge variant="secondary">{vehicles.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              getStatusBadge={getStatusBadge}
              getStatusColor={getStatusColor}
              compact={compact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleCard({
  vehicle,
  getStatusBadge,
  getStatusColor,
  compact,
}: {
  vehicle: DisplayVehicle;
  getStatusBadge: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  compact: boolean;
}) {
  const departureTime = new Date(vehicle.departureTime);
  const now = new Date();
  const diffMinutes = Math.round(
    (departureTime.getTime() - now.getTime()) / (1000 * 60)
  );

  return (
    <div
      className={`rounded-lg border p-4 ${
        vehicle.status === "BOARDING" ? "bg-green-50 border-green-200" : "bg-white"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-mono text-lg font-bold">{vehicle.plateNumber}</p>
          <p className="text-sm text-muted-foreground">{vehicle.type}</p>
        </div>
        {getStatusBadge(vehicle.status)}
      </div>

      {/* Route */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{vehicle.route.origin}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium">{vehicle.route.destination}</span>
      </div>

      {/* Details */}
      {!compact && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Departure
            </span>
            <span className="font-medium">
              {departureTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {vehicle.status === "ARRIVING" && diffMinutes > 0 && (
                <span className="ml-1 text-blue-600">
                  ({diffMinutes} min)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" /> Seats
            </span>
            <span>
              <span
                className={`font-bold ${
                  vehicle.availableSeats === 0
                    ? "text-red-600"
                    : vehicle.availableSeats < 5
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {vehicle.availableSeats}
              </span>
              <span className="text-muted-foreground"> / {vehicle.totalSeats}</span>
            </span>
          </div>

          {/* Seat availability bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${getStatusColor(vehicle.status)}`}
              style={{
                width: `${((vehicle.totalSeats - vehicle.availableSeats) / vehicle.totalSeats) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
