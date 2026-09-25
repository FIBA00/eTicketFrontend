export default function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  caption?: string;
  icon: typeof Banknote;
  tone?: "default" | "accent" | "orange";
}) {
  return (
    <div
      className={`rounded-sm border border-border bg-card p-5 ${tone === "accent" ? "border-primary/25 bg-primary/[0.045]" : tone === "orange" ? "border-accent/25 bg-accent/[0.045]" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <Icon
          size={16}
          className={
            tone === "orange"
              ? "text-accent"
              : tone === "accent"
                ? "text-primary"
                : "text-muted-foreground"
          }
        />
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] tabular-nums">
        {value}
      </div>
      {caption && (
        <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
      )}
    </div>
  );
}
