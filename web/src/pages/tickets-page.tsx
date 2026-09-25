export default function TicketsPage() {
  const query = useGetTickets();
  const online = useOnlineStatus();
  const queueCount = useQueueCount();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "queued">("all");
  const [reprinting, setReprinting] = useState<ApiTicket | null>(null);
  const tickets = query.data ?? [];
  const filtered = tickets.filter((ticket) => {
    const haystack =
      `${ticket.id} ${ticket.origin} ${ticket.destination} ${ticket.vehiclePlate}`.toLowerCase();
    return (
      haystack.includes(search.toLowerCase()) &&
      (filter !== "today" ||
        new Date(ticket.issuedAt).toDateString() === new Date().toDateString())
    );
  });
  const printTicket = (ticket: ApiTicket) => {
    setReprinting(ticket);
    window.setTimeout(() => window.print(), 50);
  };
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Audit trail · Issued fares"
        title="Ticket register"
        description="Search every recorded receipt, identify unsynced device tickets, and reprint a passenger copy when needed."
        action={
          <Link
            href="/ticketing"
            data-testid="link-register-new-ticket"
            className="flex items-center justify-center gap-2 rounded-sm border border-primary/30 bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            <Ticket size={16} />
            New ticket
          </Link>
        }
      />
      {queueCount > 0 && (
        <div
          data-testid="banner-queued-tickets"
          className="mb-5 flex items-center justify-between gap-4 rounded-sm border border-accent/35 bg-accent/8 p-4"
        >
          <div className="flex items-center gap-3">
            <CloudOff size={18} className="text-accent" />
            <div>
              <div className="text-sm font-semibold">
                {queueCount} ticket{queueCount > 1 ? "s" : ""} waiting for sync
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {online
                  ? "Connection restored. Sync is in progress."
                  : "Tickets are stored securely on this device."}
              </div>
            </div>
          </div>
          <Link
            href="/settings"
            data-testid="link-queued-settings"
            className="text-xs font-semibold text-accent-foreground hover:underline"
          >
            Queue settings <ArrowRight size={12} className="ml-1 inline" />
          </Link>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            data-testid="input-ticket-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search receipt, route, or vehicle…"
            className="w-full rounded-sm border border-input bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex rounded-sm border border-border bg-card p-1">
          {(["all", "today", "queued"] as const).map((option) => (
            <button
              key={option}
              data-testid={`button-filter-${option}`}
              onClick={() => setFilter(option)}
              className={`rounded-sm px-3 py-2 text-xs font-medium capitalize ${filter === option ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {option === "queued" ? `Queued (${queueCount})` : option}
            </button>
          ))}
        </div>
      </div>
      {query.isLoading ? (
        <LoadingBlock label="Loading ticket register" />
      ) : query.isError ? (
        <QueryError
          message={errorMessage(query.error)}
          retry={() => void query.refetch()}
        />
      ) : filter === "queued" ? (
        <QueuedRegister />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "No matching tickets" : "No tickets in this view"}
          description={
            search
              ? "Try a receipt ID, route name, or vehicle plate."
              : "Issued tickets will build the station paper trail here."
          }
          action={
            !search && (
              <Link
                href="/ticketing"
                data-testid="link-register-empty-issue"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Issue a ticket
              </Link>
            )
          }
        />
      ) : (
        <div
          data-testid="table-ticket-register"
          className="overflow-x-auto rounded-sm border border-border bg-card"
        >
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.35fr_1fr_0.8fr_0.8fr_44px] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>Receipt / route</span>
              <span>Vehicle</span>
              <span>Issued</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {filtered.map((ticket, index) => (
              <div
                key={ticket.id}
                data-testid={`row-register-${ticket.id}`}
                className={`grid grid-cols-[1.35fr_1fr_0.8fr_0.8fr_44px] items-center gap-4 border-b border-border px-5 py-4 last:border-0 ${index % 2 ? "bg-muted/[0.14]" : ""}`}
              >
                <div>
                  <div className="font-mono text-xs font-semibold">
                    {ticket.id}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {ticket.origin} <span className="mx-1">→</span>{" "}
                    {ticket.destination}
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
                <button
                  data-testid={`button-reprint-${ticket.id}`}
                  onClick={() => printTicket(ticket)}
                  title="Reprint receipt"
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Printer size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
                <span>Route</span>
                <span>{reprinting.routeId}</span>
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
    </div>
  );
}
