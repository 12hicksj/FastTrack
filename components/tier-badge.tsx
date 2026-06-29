const CHIP: Record<string, { bg: string; text: string; dot: string }> = {
  auto_approved:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  agent_review:    { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  senior_adjuster: { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500"    },
};

const LABEL: Record<string, string> = {
  auto_approved:   "Auto-approve",
  agent_review:    "Agent review",
  senior_adjuster: "Senior adjuster",
};

export function TierBadge({ tier }: { tier: string }) {
  const chip = CHIP[tier] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${chip.bg} ${chip.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${chip.dot}`} />
      {LABEL[tier] ?? tier}
    </span>
  );
}
