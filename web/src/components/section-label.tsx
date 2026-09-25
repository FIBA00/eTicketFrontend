export default function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}
