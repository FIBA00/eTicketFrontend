import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Clock, MapPin, Users } from "lucide-react";
import { usePublicStationDisplay } from "@/hooks/use-display";

// Full-screen public display for TV/monitors at stations
// No login required — accessible via /display/public/:stationId

export default function PublicDisplayPage() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId ?? "";

  const { data: display, isLoading, error } = usePublicStationDisplay(stationId);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto" />
          <p>Loading display...</p>
        </div>
      </div>
    );
  }

  if (error || !display) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl">Display not available</p>
          <p className="mt-2 text-gray-400">Please check station ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-700 pb-6">
        <div>
          <h1 className="text-4xl font-bold">{display.station.name}</h1>
          <p className="mt-1 text-gray-400">Departure Board</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-bold">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 text-gray-400">
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Now Boarding - Large Display */}
      {display.active.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold text-green-400">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
            </span>
            NOW BOARDING
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {display.active.map((vehicle) => (
              <BoardingCard key={vehicle.id} vehicle={vehicle} large />
            ))}
          </div>
        </div>
      )}

      {/* Arriving Soon */}
      {display.incoming.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold text-blue-400">ARRIVING SOON</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {display.incoming.map((vehicle) => (
              <BoardingCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </div>
      )}

      {/* Departed */}
      {display.departed.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-400">RECENTLY DEPARTED</h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            {display.departed.map((vehicle) => (
              <DepartedCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-gray-700 pt-4 text-center text-gray-500">
        <p>Last updated: {new Date(display.lastUpdated).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

function BoardingCard({
  vehicle,
  large = false,
}: {
  vehicle: {
    plateNumber: string;
    type: string;
    route: { origin: string; destination: string };
    departureTime: string;
    availableSeats: number;
    totalSeats: number;
    status: string;
  };
  large?: boolean;
}) {
  const departureTime = new Date(vehicle.departureTime);
  const now = new Date();
  const diffMinutes = Math.round((departureTime.getTime() - now.getTime()) / (1000 * 60));

  return (
    <div
      className={`rounded-lg border-2 p-6 ${
        vehicle.status === "BOARDING"
          ? "border-green-500 bg-green-900/30"
          : "border-blue-500 bg-blue-900/30"
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className={`font-mono font-bold ${large ? "text-4xl" : "text-2xl"}`}>
            {vehicle.plateNumber}
          </p>
          <p className="text-gray-400">{vehicle.type}</p>
        </div>
        {vehicle.status === "BOARDING" && (
          <span className="rounded bg-green-500 px-3 py-1 text-sm font-bold text-black">
            BOARDING
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-gray-400" />
        <span className={large ? "text-xl" : "text-lg"}>
          {vehicle.route.origin} → {vehicle.route.destination}
        </span>
      </div>

      <div className="flex items-center justify-between text-gray-300">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-mono">
            {departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {vehicle.status === "ARRIVING" && diffMinutes > 0 && (
            <span className="text-blue-400">({diffMinutes} min)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span
            className={`font-bold ${
              vehicle.availableSeats === 0
                ? "text-red-400"
                : vehicle.availableSeats < 5
                ? "text-orange-400"
                : "text-green-400"
            }`}
          >
            {vehicle.availableSeats}
          </span>
          <span className="text-gray-500">/ {vehicle.totalSeats}</span>
        </div>
      </div>
    </div>
  );
}

function DepartedCard({
  vehicle,
}: {
  vehicle: {
    plateNumber: string;
    route: { origin: string; destination: string };
    departureTime: string;
  };
}) {
  return (
    <div className="rounded border border-gray-700 bg-gray-800/50 p-4 opacity-60">
      <p className="font-mono font-bold text-gray-300">{vehicle.plateNumber}</p>
      <p className="mt-1 text-sm text-gray-400">
        {vehicle.route.origin} → {vehicle.route.destination}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {new Date(vehicle.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
