export interface RoutingResult {
  routingId: number;
  claimId: string;
  tierName: string;
  confidenceSnapshot: string;
  estimateSnapshot: string;
  fraudFlagged: boolean;
  triggeredBy: string;
  decidedAt: Date;
}
