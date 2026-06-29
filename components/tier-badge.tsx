const DOT: Record<string, string> = {
  auto_approved: "bg-emerald-500",
  agent_review: "bg-amber-500",
  senior_adjuster: "bg-red-500",
};

const LABEL: Record<string, string> = {
  auto_approved: "Auto-approve",
  agent_review: "Agent review",
  senior_adjuster: "Senior adjuster",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT[tier] ?? "bg-gray-400"}`} />
      {LABEL[tier] ?? tier}
    </span>
  );
}
