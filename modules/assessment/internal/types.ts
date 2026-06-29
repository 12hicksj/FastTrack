export interface FindingRecord {
  findingId: number;
  partLabel: string;
  damageTypeName: string;
  severityName: string;
  repairActionName: string;
  confidence: string;
  uncertaintyNote: string | null;
}

export interface AssessmentRecord {
  assessmentId: string;
  claimId: string;
  version: number;
  source: string;
  modelVersion: string;
  overallConfidence: string;
  summary: string;
  isCurrent: boolean;
  createdAt: Date;
  findings: FindingRecord[];
  lineItems: import("../../estimate/internal/types").LineItemRecord[];
}
