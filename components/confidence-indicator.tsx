interface ConfidenceIndicatorProps {
  value: number | string;
  showBar?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  value,
  showBar = true,
  className,
}: ConfidenceIndicatorProps) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const pct = Math.round(num * 100);

  const color =
    num >= 0.9 ? "bg-emerald-500" : num >= 0.7 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    num >= 0.9
      ? "text-emerald-700 dark:text-emerald-400"
      : num >= 0.7
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {showBar && (
        <div className="h-1 w-20 rounded-full bg-border overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className={`text-sm font-medium tabular-nums ${textColor}`}>{pct}%</span>
    </div>
  );
}
