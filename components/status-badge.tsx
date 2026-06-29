import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  ready_for_assessment: "bg-blue-100 text-blue-800",
  assessed: "bg-indigo-100 text-indigo-800",
  routed: "bg-purple-100 text-purple-800",
  in_review: "bg-yellow-100 text-yellow-800",
  auto_approved: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  escalated: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
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
    <Badge className={`text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}`}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
