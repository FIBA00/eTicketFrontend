export default function LoadingBlock({
  label = "Loading station data",
}: {
  label?: string;
}) {
  return (
    <div data-testid="state-loading" className="space-y-3">
      <div className="h-24 animate-pulse rounded-sm bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
