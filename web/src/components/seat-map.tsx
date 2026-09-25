import { cn } from "@/lib/utils";
import { Armchair } from "lucide-react";
import type { SeatMapEntry } from "@/hooks/use-tickets";

interface SeatMapProps {
  seats: SeatMapEntry[];
  selectedSeat: number | null;
  onSelectSeat: (seatNumber: number) => void;
  capacity: number;
  disabled?: boolean;
}

export function SeatMap({
  seats,
  selectedSeat,
  onSelectSeat,
  capacity,
  disabled,
}: SeatMapProps) {
  // Group seats into rows of 4 (2x2 layout typical for buses)
  const seatsPerRow = 4;
  const rows: SeatMapEntry[][] = [];

  for (let i = 0; i < seats.length; i += seatsPerRow) {
    rows.push(seats.slice(i, i + seatsPerRow));
  }

  return (
    <div className="space-y-2">
      {/* Driver row */}
      <div className="flex justify-end pb-2">
        <div className="flex h-10 w-16 items-center justify-center rounded-t-lg border-2 border-muted bg-muted/50">
          <span className="text-xs text-muted-foreground">Driver</span>
        </div>
      </div>

      {/* Seat rows */}
      <div className="space-y-2">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-2">
            {/* Left pair */}
            <div className="flex gap-1">
              {row.slice(0, 2).map((seat) => (
                <SeatButton
                  key={seat.seatNumber}
                  seat={seat}
                  isSelected={selectedSeat === seat.seatNumber}
                  onSelect={() => onSelectSeat(seat.seatNumber)}
                  disabled={disabled}
                />
              ))}
            </div>

            {/* Aisle */}
            <div className="w-6" />

            {/* Right pair */}
            <div className="flex gap-1">
              {row.slice(2, 4).map((seat) => (
                <SeatButton
                  key={seat.seatNumber}
                  seat={seat}
                  isSelected={selectedSeat === seat.seatNumber}
                  onSelect={() => onSelectSeat(seat.seatNumber)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded border-2 border-primary bg-background" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded border-2 border-muted bg-muted" />
          <span>Taken</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded border-2 border-primary bg-primary" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  isSelected,
  onSelect,
  disabled,
}: {
  seat: SeatMapEntry;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const isTaken = seat.status === "taken";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isTaken || disabled}
      className={cn(
        "flex h-10 w-10 flex-col items-center justify-center rounded-md border-2 text-xs font-medium transition-colors",
        isTaken &&
          "cursor-not-allowed border-muted bg-muted text-muted-foreground",
        !isTaken &&
          !isSelected &&
          "border-primary/30 bg-background hover:border-primary hover:bg-primary/5",
        isSelected && "border-primary bg-primary text-primary-foreground",
        disabled && !isTaken && "cursor-not-allowed opacity-50",
      )}
    >
      <Armchair className="h-3 w-3 mb-0.5" />
      {seat.seatNumber}
    </button>
  );
}
