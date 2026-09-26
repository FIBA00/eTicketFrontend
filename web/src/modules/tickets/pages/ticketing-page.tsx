export default function TicketingPage() {
  const online = useOnlineStatus();
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const [vehiclePlate, setVehiclePlate] = useState(VEHICLES[0].plate);
  const [lastIssued, setLastIssued] = useState<TicketInput | ApiTicket | null>(
    null,
  );
  const [notice, setNotice] = useState<"success" | "queued" | null>(null);
  const route = ROUTES.find((item) => item.id === routeId) ?? ROUTES[0];
  const preview = useMemo(
    () => makeTicket(route, vehiclePlate),
    [route, vehiclePlate],
  );
  const issue = (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    const ticket = makeTicket(route, vehiclePlate);
    if (!online) {
      queueTicket(ticket);
      setLastIssued(ticket);
      setNotice("queued");
      return;
    }
    createTicket.mutate(
      { data: ticket },
      {
        onSuccess: (created) => {
          setLastIssued(created);
          setNotice("success");
          void queryClient.invalidateQueries({
            queryKey: getGetTicketsQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetTicketSummaryQueryKey(),
          });
        },
        onError: () => {
          queueTicket(ticket);
          setLastIssued(ticket);
          setNotice("queued");
        },
      },
    );
  };
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Counter workflow · New issuance"
        title="Issue a passenger ticket"
        description="Select the route and vehicle, confirm the fare ledger, then print a receipt for the passenger."
        action={
          <div
            data-testid="status-ticket-mode"
            className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs"
          >
            <span
              className={`h-2 w-2 rounded-full ${online ? "bg-primary" : "bg-accent"}`}
            />
            {online ? "Ready to record" : "Local queue enabled"}
          </div>
        }
      />
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
        <form
          onSubmit={issue}
          className="rounded-sm border border-border bg-card"
        >
          <div className="border-b border-border px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-xs font-semibold">
                01
              </div>
              <div>
                <h2 className="text-sm font-semibold">Journey details</h2>
                <p className="text-xs text-muted-foreground">
                  Choose from example routes and fares in the supplied demo
                  data.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6 p-5 sm:p-7">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold">Route</span>
              <select
                data-testid="select-route"
                value={routeId}
                onChange={(event) => setRouteId(event.target.value)}
                className="w-full rounded-sm border border-input bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {ROUTES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.distanceKm} km
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-border bg-muted/35 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Origin
                </div>
                <div
                  data-testid="text-route-origin"
                  className="mt-2 text-sm font-semibold"
                >
                  {route.origin}
                </div>
              </div>
              <div className="rounded-sm border border-border bg-muted/35 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Destination
                </div>
                <div
                  data-testid="text-route-destination"
                  className="mt-2 text-sm font-semibold"
                >
                  {route.destination}
                </div>
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold">
                Vehicle plate
              </span>
              <select
                data-testid="select-vehicle"
                value={vehiclePlate}
                onChange={(event) => setVehiclePlate(event.target.value)}
                className="w-full rounded-sm border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {VEHICLES.map((vehicle) => (
                  <option key={vehicle.plate} value={vehicle.plate}>
                    {vehicle.plate} · {vehicle.operator}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-start gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
              <CircleHelp size={15} className="mt-0.5 shrink-0" />
              <p>
                Service charge is {route.distanceKm < 50 ? "5%" : "4%"} for this
                distance. VAT, station fee, and commission are calculated from
                the service charge.
              </p>
            </div>
            <button
              data-testid="button-issue-ticket"
              type="submit"
              disabled={createTicket.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65"
            >
              <Send size={16} />
              {createTicket.isPending
                ? "Recording ticket…"
                : online
                  ? "Record and issue ticket"
                  : "Save ticket to device queue"}
            </button>
            {createTicket.isError && (
              <div
                data-testid="status-ticket-error"
                className="flex items-center gap-2 text-xs text-destructive"
              >
                <AlertCircle size={14} />
                {errorMessage(createTicket.error)}
              </div>
            )}
            {notice && (
              <div
                data-testid={`status-ticket-${notice}`}
                className={`flex items-center gap-2 rounded-sm border p-3 text-xs ${notice === "queued" ? "border-accent/30 bg-accent/8 text-accent-foreground" : "border-primary/20 bg-primary/5 text-primary"}`}
              >
                {notice === "queued" ? (
                  <CloudOff size={15} />
                ) : (
                  <Check size={15} />
                )}
                {notice === "queued"
                  ? "Ticket saved locally. It will sync when the connection returns."
                  : "Ticket recorded successfully. The receipt is ready to print."}
              </div>
            )}
          </div>
        </form>
        <div className="xl:sticky xl:top-[92px]">
          <SectionLabel
            right={
              <span className="font-mono text-[10px] text-muted-foreground">
                PREVIEW
              </span>
            }
          >
            Fare breakdown
          </SectionLabel>
          <div className="rounded-sm border border-border bg-card">
            <div className="border-b border-dashed border-border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Passenger fare
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] tabular-nums">
                    {currency(preview.totalETB)}
                  </div>
                </div>
                <div className="rounded-sm bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">
                  ET / {route.id}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{route.origin}</span>
                <ArrowRight size={13} />
                <span>{route.destination}</span>
                <span className="ml-auto font-mono">{route.distanceKm} km</span>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <BreakdownRow label="Base fare" value={preview.fareETB} />
              <BreakdownRow
                label={`Service charge (${preview.serviceChargeRate * 100}%)`}
                value={preview.serviceChargeETB}
              />
              <BreakdownRow
                label="VAT (15% of service)"
                value={preview.vatETB}
              />
              <BreakdownRow
                label="Station fee (10% of service)"
                value={preview.stationFeeETB}
              />
              <div className="border-t border-border pt-3">
                <BreakdownRow
                  label="Passenger pays"
                  value={preview.totalETB}
                  strong
                />
              </div>
            </div>
            <div className="border-t border-border bg-muted/35 px-5 py-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Ticketer commission
                </span>
                <span className="font-mono font-semibold text-accent-foreground">
                  {currency(preview.ticketerCommissionETB)}
                </span>
              </div>
            </div>
          </div>
          {lastIssued && (
            <div className="receipt-print mt-4 rounded-sm border border-primary/20 bg-primary/5 p-4 no-print">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Check size={15} />
                Receipt ready · {lastIssued.id}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Print a paper copy for the passenger.
              </p>
              <button
                data-testid="button-print-new-receipt"
                onClick={() => window.print()}
                className="mt-3 flex items-center gap-2 rounded-sm border border-primary/25 bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
              >
                <Printer size={14} />
                Print receipt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
