export default function QueuedRegister() {
  const queue = readQueue();
  const [reprinting, setReprinting] = useState<TicketInput | null>(null);
  const printTicket = (ticket: TicketInput) => {
    setReprinting(ticket);
    window.setTimeout(() => window.print(), 50);
  };
  return queue.length === 0 ? (
    <EmptyState
      title="Queue is clear"
      description="There are no local tickets waiting for the station service."
    />
  ) : (
    <>
      <div
        data-testid="table-queued-register"
        className="overflow-hidden rounded-sm border border-accent/30 bg-card"
      >
        {queue.map((ticket) => (
          <div
            key={ticket.id}
            className="flex flex-col justify-between gap-3 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center"
          >
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {ticket.id}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {ticket.origin} → {ticket.destination} · {ticket.vehiclePlate}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="font-mono text-xs font-semibold">
                  {currency(ticket.totalETB)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-accent-foreground">
                  Pending sync
                </div>
              </div>
              <button
                data-testid={`button-reprint-queued-${ticket.id}`}
                onClick={() => printTicket(ticket)}
                title="Print queued receipt"
                className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Printer size={15} />
              </button>
              <CloudOff size={16} className="text-accent" />
            </div>
          </div>
        ))}
      </div>
      {reprinting && (
        <div className="receipt-print hidden">
          <div className="mx-auto max-w-sm border border-border p-6 font-mono text-sm">
            <div className="text-center text-lg font-semibold">
              TRANSIT DESK
            </div>
            <div className="mt-1 text-center text-xs">{STATION_NAME}</div>
            <div className="my-5 border-y border-dashed py-3 text-center font-semibold">
              PASSENGER RECEIPT
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Receipt</span>
                <span>{reprinting.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Journey</span>
                <span>
                  {reprinting.origin} → {reprinting.destination}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vehicle</span>
                <span>{reprinting.vehiclePlate}</span>
              </div>
              <div className="flex justify-between border-t border-dashed pt-2 font-semibold">
                <span>Total</span>
                <span>{currency(reprinting.totalETB)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
