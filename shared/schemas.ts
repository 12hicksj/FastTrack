import { z } from "zod";

// ── Claim intake ──────────────────────────────────────────────────────────────

export const CreateClaimSchema = z.object({
  vehicleId: z.number().int().positive(),
  incidentDate: z.string().date(),
  incidentDescription: z.string().min(1).max(2000),
  photoUrls: z
    .array(
      z.object({
        url: z.string().url(),
        photoTypeName: z.string(),
      })
    )
    .min(1),
});

export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;

// ── Assessment trigger ────────────────────────────────────────────────────────

export const AssessClaimSchema = z.object({});
export type AssessClaimInput = z.infer<typeof AssessClaimSchema>;

// ── Agent review ──────────────────────────────────────────────────────────────

export const FindingCorrectionSchema = z.object({
  findingId: z.number().int().positive(),
  correctedSeverityId: z.number().int().positive().optional(),
  correctedRepairActionId: z.number().int().positive().optional(),
  correctedPartLabel: z.string().optional(),
  note: z.string().optional(),
});

export const ReviewClaimSchema = z.object({
  decisionName: z.enum(["approved", "denied", "escalated"]),
  finalTotal: z.string().regex(/^\d+(\.\d{1,2})?$/),
  notes: z.string().optional(),
  corrections: z.array(FindingCorrectionSchema).optional(),
});

export type ReviewClaimInput = z.infer<typeof ReviewClaimSchema>;

// ── Assessment response contract (section 9) ──────────────────────────────────

export const AssessmentFindingResponseSchema = z.object({
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
  findings: z.array(AssessmentFindingResponseSchema),
});

export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
export type AssessmentFindingResponse = z.infer<
  typeof AssessmentFindingResponseSchema
>;

// ── Role switcher ─────────────────────────────────────────────────────────────

export const SwitchRoleSchema = z.object({
  userId: z.number().int().positive(),
});

export type SwitchRoleInput = z.infer<typeof SwitchRoleSchema>;
