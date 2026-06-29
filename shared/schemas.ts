import { z } from "zod";

// ── Intake ─────────────────────────────────────────────────────────────────────

export const PhotoUrlSchema = z.object({
  url: z.string().url(),
  photoTypeName: z.string(),
});

export const CreateClaimSchema = z.object({
  vehicleId: z.number().int().positive(),
  incidentDate: z.string().date(),
  incidentDescription: z.string().min(10).max(2000),
  photos: z.array(PhotoUrlSchema).min(4, "At least 4 photos are required"),
});

export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;

// ── Assessment ─────────────────────────────────────────────────────────────────

export const AssessClaimSchema = z.object({});
export type AssessClaimInput = z.infer<typeof AssessClaimSchema>;

// ── Review ─────────────────────────────────────────────────────────────────────

export const FindingCorrectionSchema = z.object({
  findingId: z.number().int().positive(),
  correctedDamageTypeId: z.number().int().positive().optional(),
  correctedSeverityId: z.number().int().positive().optional(),
  correctedRepairActionId: z.number().int().positive().optional(),
  correctedPartLabel: z.string().optional(),
  note: z.string().optional(),
});

export const ReviewClaimSchema = z.object({
  decision: z.enum(["approved", "denied", "escalated"]),
  finalTotal: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid dollar amount"),
  notes: z.string().optional(),
  corrections: z.array(FindingCorrectionSchema).optional(),
});

export type ReviewClaimInput = z.infer<typeof ReviewClaimSchema>;

// ── Role switcher ──────────────────────────────────────────────────────────────

export const SwitchRoleSchema = z.object({
  userId: z.number().int().positive(),
});

export type SwitchRoleInput = z.infer<typeof SwitchRoleSchema>;

// ── Assessment response contract (spec section 9) ─────────────────────────────

export const FindingResponseSchema = z.object({
  partLabel: z.string(),
  damageType: z.enum(["scratch", "dent", "structural", "glass"]),
  severity: z.enum(["minor", "moderate", "severe"]),
  repairAction: z.enum(["repair", "replace"]),
  confidence: z.number().min(0).max(1),
  uncertaintyNote: z.string().nullable(),
});

export const AssessmentResponseSchema = z.object({
  claimId: z.string(),
  source: z.enum(["real", "mock"]),
  modelVersion: z.string(),
  overallConfidence: z.number().min(0).max(1),
  summary: z.string(),
  findings: z.array(FindingResponseSchema),
});

export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
export type FindingResponse = z.infer<typeof FindingResponseSchema>;

// ── Shared record shapes (used by both route handlers and frontend) ─────────────

export const LineItemSchema = z.object({
  lineItemId: z.number(),
  description: z.string(),
  partCost: z.string(),
  laborHours: z.string(),
  laborRate: z.string(),
  lineTotal: z.string(),
});

export const FindingRecordSchema = z.object({
  findingId: z.number(),
  partLabel: z.string(),
  damageType: z.string(),
  severity: z.string(),
  repairAction: z.string(),
  confidence: z.string(),
  uncertaintyNote: z.string().nullable(),
  correction: z
    .object({
      correctedDamageTypeId: z.number().nullable(),
      correctedSeverityId: z.number().nullable(),
      correctedRepairActionId: z.number().nullable(),
      correctedPartLabel: z.string().nullable(),
      note: z.string().nullable(),
    })
    .nullable(),
});

export const AssessmentRecordSchema = z.object({
  assessmentId: z.string(),
  version: z.number(),
  source: z.string(),
  modelVersion: z.string(),
  overallConfidence: z.string(),
  summary: z.string(),
  isCurrent: z.boolean(),
  createdAt: z.string(),
  findings: z.array(FindingRecordSchema),
  lineItems: z.array(LineItemSchema),
  estimateTotal: z.string(),
  possibleTotalLoss: z.boolean(),
});

export const RoutingDecisionSchema = z.object({
  routingId: z.number(),
  tier: z.string(),
  confidenceSnapshot: z.string(),
  estimateSnapshot: z.string(),
  fraudFlagged: z.boolean(),
  triggeredBy: z.string(),
  decidedAt: z.string(),
});

export const ClaimSummarySchema = z.object({
  claimId: z.string(),
  claimNumber: z.string(),
  status: z.string(),
  routingTier: z.string().nullable(),
  estimateTotal: z.string().nullable(),
  incidentDate: z.string(),
  vehicleMake: z.string(),
  vehicleModel: z.string(),
  vehicleYear: z.number(),
  fraudFlagged: z.boolean(),
  assignedAgentId: z.number().nullable(),
  customerFirstName: z.string(),
  customerLastName: z.string(),
});

export const PhotoSchema = z.object({
  photoId: z.number(),
  storageUrl: z.string(),
  photoTypeName: z.string(),
  qualityCheckPassed: z.boolean(),
});

export const ReviewSchema = z.object({
  reviewId: z.number(),
  decision: z.string(),
  finalTotal: z.string(),
  notes: z.string().nullable(),
  reviewedAt: z.string(),
});

export const ClaimDetailSchema = ClaimSummarySchema.extend({
  vehicleVin: z.string(),
  vehicleValue: z.string(),
  vehicleLicensePlate: z.string().nullable(),
  incidentDescription: z.string(),
  reportedByUserId: z.number(),
  photos: z.array(PhotoSchema),
  assessment: AssessmentRecordSchema.nullable(),
  routing: RoutingDecisionSchema.nullable(),
  review: ReviewSchema.nullable(),
});

export type ClaimSummary = z.infer<typeof ClaimSummarySchema>;
export type ClaimDetail = z.infer<typeof ClaimDetailSchema>;
export type AssessmentRecord = z.infer<typeof AssessmentRecordSchema>;
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;
