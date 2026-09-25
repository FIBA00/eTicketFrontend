export default function RevenuePage() {
  const query = useGetTicketSummary();
  const summary = query.data;
  const rows = [
    ["Base fares", summary?.baseFaresETB, "Passenger fare value"],
    ["Service charges", summary?.serviceChargesETB, "5% / 4% distance rule"],
    ["VAT", summary?.vatETB, "15% of service charge"],
    ["Station fees", summary?.stationFeesETB, "10% of service charge"],
    ["Ticketer commission", summary?.commissionsETB, "5% of service charge"],
  ];
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Finance · Daily close"
        title="Revenue & settlement"
        description="A transparent breakdown of today's issued fares, charges, and the amount ready for station settlement."
        action={
          <button
            data-testid="button-export-revenue"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"
          >
            <ArrowDownToLine size={16} />
            Export view
          </button>
        }
      />
      {query.isLoading ? (
        <LoadingBlock label="Loading settlement figures" />
      ) : query.isError ? (
        <QueryError
          message={errorMessage(query.error)}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Gross collection"
              value={currency(summary?.grossCollectionETB)}
              caption="Total collected from passengers"
              icon={Banknote}
              tone="accent"
            />
            <MetricCard
              label="Deductions & shares"
              value={currency(
                (summary?.vatETB ?? 0) +
                  (summary?.stationFeesETB ?? 0) +
                  (summary?.commissionsETB ?? 0),
              )}
              caption="VAT, station fees, commission"
              icon={SlidersHorizontal}
            />
            <MetricCard
              label="Ready for settlement"
              value={currency(summary?.netSettlementETB)}
              caption={`${summary?.ticketCount ?? 0} ticket${summary?.ticketCount === 1 ? "" : "s"} in today's close`}
              icon={ShieldCheck}
              tone="orange"
            />
          </div>
          <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_380px]">
            <section>
              <SectionLabel>Ledger lines</SectionLabel>
              <div className="rounded-sm border border-border bg-card">
                {rows.map(([label, value, note], index) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between border-b border-border px-5 py-5 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {note}
                      </div>
                    </div>
                    <div
                      className={`font-mono text-sm font-semibold tabular-nums ${index > 1 ? "text-accent-foreground" : ""}`}
                    >
                      {currency(value as number)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <SectionLabel>Settlement statement</SectionLabel>
              <div className="rounded-sm border border-border bg-sidebar p-6 text-sidebar-foreground">
                <div className="flex items-center justify-between border-b border-sidebar-border pb-5">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">
                      Station close
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      {STATION_CODE} ·{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date())}
                    </div>
                  </div>
                  <Landmark size={21} className="text-sidebar-primary" />
                </div>
                <div className="py-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">
                    Net settlement
                  </div>
                  <div
                    data-testid="text-revenue-net-settlement"
                    className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-sidebar-primary tabular-nums"
                  >
                    {currency(summary?.netSettlementETB)}
                  </div>
                </div>
                <div className="space-y-3 border-t border-sidebar-border pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-sidebar-foreground/60">Tickets</span>
                    <span className="font-mono">
                      {summary?.ticketCount ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sidebar-foreground/60">
                      Gross collection
                    </span>
                    <span className="font-mono">
                      {currency(summary?.grossCollectionETB)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sidebar-foreground/60">
                      Commission retained
                    </span>
                    <span className="font-mono">
                      {currency(summary?.commissionsETB)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
