export default function QueryError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div
      data-testid="state-error"
      className="flex flex-col items-start gap-3 rounded-sm border border-destructive/25 bg-destructive/5 p-5"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertCircle size={17} />
        Could not load station data
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
      <button
        data-testid="button-retry"
        onClick={retry}
        className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}
