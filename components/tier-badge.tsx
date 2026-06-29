import { Badge } from "@/components/ui/badge";

const TIER_STYLES: Record<string, string> = {
  auto_approved: "bg-green-100 text-green-800",
  agent_review: "bg-yellow-100 text-yellow-800",
  senior_adjuster: "bg-red-100 text-red-800",
};

const TIER_LABELS: Record<string, string> = {
  auto_approved: "Auto-Approve",
  agent_review: "Agent Review",
  senior_adjuster: "Senior Adjuster",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <Badge className={`text-xs font-medium ${TIER_STYLES[tier] ?? "bg-gray-100 text-gray-800"}`}>
      {TIER_LABELS[tier] ?? tier}
    </Badge>
  );
}
