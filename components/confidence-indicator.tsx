interface ConfidenceIndicatorProps {
  value: number | string; // 0–1 numeric or string like "0.9500"
  className?: string;
}

export function ConfidenceIndicator({ value, className }: ConfidenceIndicatorProps) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const pct = Math.round(num * 100);

  const color =
    num >= 0.9
      ? "bg-green-500"
      : num >= 0.7
        ? "bg-amber-500"
        : "bg-red-500";

  const textColor =
    num >= 0.9
      ? "text-green-700"
      : num >= 0.7
        ? "text-amber-700"
        : "text-red-700";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-medium tabular-nums ${textColor}`}>{pct}%</span>
    </div>
  );
}
