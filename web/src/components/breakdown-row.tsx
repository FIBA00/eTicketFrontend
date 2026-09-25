export default function BreakdownRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${strong ? "font-semibold" : ""}`}
    >
      <span className={strong ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className="font-mono text-xs tabular-nums">{currency(value)}</span>
    </div>
  );
}
