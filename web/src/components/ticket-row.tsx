export default function TicketRow({
  ticket,
  index,
}: {
  ticket: ApiTicket;
  index: number;
}) {
  return (
    <div
      data-testid={`row-ticket-${ticket.id}`}
      className={`grid gap-2 border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[1.2fr_1fr_0.7fr_0.8fr] sm:items-center ${index % 2 ? "bg-muted/[0.16]" : ""}`}
    >
      <div>
        <div className="text-sm font-medium">
          {ticket.origin} <span className="text-muted-foreground">→</span>{" "}
          {ticket.destination}
        </div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          {ticket.id} · {ticket.distanceKm} km
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TrainFront size={14} />
        {ticket.vehiclePlate}
      </div>
      <div className="text-xs text-muted-foreground">
        {shortDate(ticket.issuedAt)}
      </div>
      <div className="text-right font-mono text-xs font-semibold tabular-nums">
        {currency(ticket.totalETB)}
      </div>
    </div>
  );
}
