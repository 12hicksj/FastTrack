const DOT: Record<string, string> = {
  ready_for_assessment: "bg-blue-500",
  assessed: "bg-indigo-500",
  routed: "bg-violet-500",
  in_review: "bg-amber-500",
  auto_approved: "bg-emerald-500",
  approved: "bg-emerald-500",
  denied: "bg-red-500",
  escalated: "bg-orange-500",
};

const LABEL: Record<string, string> = {
  ready_for_assessment: "Ready",
  assessed: "Assessed",
  routed: "Routed",
  in_review: "In Review",
  auto_approved: "Auto-Approved",
  approved: "Approved",
  denied: "Denied",
  escalated: "Escalated",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[status] ?? "bg-gray-400"}`} />
      {LABEL[status] ?? status}
    </span>
  );
}
