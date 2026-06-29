export type RoutingTierName = "auto_approved" | "agent_review" | "senior_adjuster";

export interface RoutingThresholds {
  confidenceMinAutoApprove: number;
  costMaxAutoApprove: number;
  costMinSupervisor: number;
}

export function determineTier(params: {
  confidence: number;
  estimateTotal: number;
  fraudFlagged: boolean;
  possibleTotalLoss: boolean;
  thresholds: RoutingThresholds;
}): RoutingTierName {
  const { confidence, estimateTotal, fraudFlagged, possibleTotalLoss, thresholds } = params;

  if (fraudFlagged || possibleTotalLoss || estimateTotal >= thresholds.costMinSupervisor) {
    return "senior_adjuster";
  }

  if (
    confidence >= thresholds.confidenceMinAutoApprove &&
    estimateTotal <= thresholds.costMaxAutoApprove
  ) {
    return "auto_approved";
  }

  return "agent_review";
}
