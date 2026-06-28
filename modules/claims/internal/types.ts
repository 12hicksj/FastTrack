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
}

export interface PhotoRecord {
  photoId: number;
  storageUrl: string;
  photoTypeName: string;
  qualityCheckPassed: boolean;
}

export interface FindingCorrection {
  correctionId: number;
  findingId: number;
  correctedSeverityId: number | null;
  correctedRepairActionId: number | null;
  correctedPartLabel: string | null;
  note: string | null;
}

export interface ReviewRecord {
  reviewId: number;
  decisionName: string;
  finalTotal: string;
  notes: string | null;
  reviewedAt: Date;
  corrections: FindingCorrection[];
}

export interface ClaimDetail extends ClaimSummary {
  vehicleVin: string;
  vehicleValue: string;
  incidentDescription: string;
  photos: PhotoRecord[];
  assessment: import("../../assessment/internal/types").AssessmentRecord | null;
  review: ReviewRecord | null;
  routingDecision: import("../../routing/internal/types").RoutingResult | null;
}
