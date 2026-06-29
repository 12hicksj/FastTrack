export interface ClaimSummary {
  claimId: string;
  claimNumber: string;
  status: string;
  routingTier: string | null;
  estimateTotal: string | null;
  incidentDate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  fraudFlagged: boolean;
  assignedAgentId: number | null;
  customerFirstName: string;
  customerLastName: string;
}

export interface ClaimDetail extends ClaimSummary {
  vehicleVin: string;
  vehicleValue: string;
  vehicleLicensePlate: string | null;
  incidentDescription: string;
  reportedByUserId: number;
  photos: {
    photoId: number;
    storageUrl: string;
    photoTypeName: string;
    qualityCheckPassed: boolean;
  }[];
  assessment: {
    assessmentId: string;
    version: number;
    source: string;
    modelVersion: string;
    overallConfidence: string;
    summary: string;
    isCurrent: boolean;
    createdAt: string;
    findings: {
      findingId: number;
      partLabel: string;
      damageType: string;
      severity: string;
      repairAction: string;
      confidence: string;
      uncertaintyNote: string | null;
      correction: {
        correctedSeverityId: number | null;
        correctedRepairActionId: number | null;
        correctedPartLabel: string | null;
        note: string | null;
      } | null;
    }[];
    lineItems: {
      lineItemId: number;
      description: string;
      partCost: string;
      laborHours: string;
      laborRate: string;
      lineTotal: string;
    }[];
    estimateTotal: string;
    possibleTotalLoss: boolean;
  } | null;
  routing: {
    routingId: number;
    tier: string;
    confidenceSnapshot: string;
    estimateSnapshot: string;
    fraudFlagged: boolean;
    triggeredBy: string;
    decidedAt: string;
  } | null;
  review: {
    reviewId: number;
    decision: string;
    finalTotal: string;
    notes: string | null;
    reviewedAt: string;
  } | null;
}
