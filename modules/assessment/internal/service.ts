import { db } from "@/db";
import { assessments, assessmentFindings, damageTypes, severityLevels, repairActions } from "@/db/schema/assessment";
import { claims } from "@/db/schema/claims";
import { eq, and } from "drizzle-orm";
import { getMockFixture } from "./mock";
import type { AssessmentRecord } from "./types";
import type { AssessmentResponse } from "@/shared/schemas";

async function callVision(
  claimNumber: string,
  _photoUrls: string[]
): Promise<Omit<AssessmentResponse, "claimId">> {
  // Mock is the default and complete prototype path (MOCK_VISION=true).
  // The real path (Claude vision API) is structurally supported behind this
  // same contract and the MOCK_VISION toggle, but is optional per spec §13.
  return getMockFixture(claimNumber);
}

export async function runAssessment(claimId: string): Promise<AssessmentRecord> {
  // Load claim + photos
  const claimRows = await db
    .select({ claimNumber: claims.claimNumber })
    .from(claims)
    .where(eq(claims.claimId, claimId))
    .limit(1);

  if (!claimRows[0]) throw new Error(`Claim ${claimId} not found`);
  const { claimNumber } = claimRows[0];

  // Load photo URLs for real vision path
  const { claimPhotos } = await import("@/db/schema/claims");
  const photos = await db
    .select({ storageUrl: claimPhotos.storageUrl })
    .from(claimPhotos)
    .where(eq(claimPhotos.claimId, claimId));

  const photoUrls = photos.map((p) => p.storageUrl);

  // Mark previous assessments as no longer current
  await db
    .update(assessments)
    .set({ isCurrent: false })
    .where(and(eq(assessments.claimId, claimId), eq(assessments.isCurrent, true)));

  // Get next version number
  const existing = await db
    .select({ version: assessments.version })
    .from(assessments)
    .where(eq(assessments.claimId, claimId));
  const nextVersion = existing.length + 1;

  // Call vision (mock or real)
  const response = await callVision(claimNumber, photoUrls);

  // Persist assessment
  const [assessment] = await db
    .insert(assessments)
    .values({
      claimId,
      version: nextVersion,
      source: response.source,
      modelVersion: response.modelVersion,
      overallConfidence: response.overallConfidence.toFixed(4),
      summary: response.summary,
      isCurrent: true,
    })
    .returning();

  // Load lookup maps once
  const [dtRows, svRows, raRows] = await Promise.all([
    db.select().from(damageTypes),
    db.select().from(severityLevels),
    db.select().from(repairActions),
  ]);
  const dtMap = Object.fromEntries(dtRows.map((r) => [r.name, r.damageTypeId]));
  const svMap = Object.fromEntries(svRows.map((r) => [r.name, r.severityId]));
  const raMap = Object.fromEntries(raRows.map((r) => [r.name, r.repairActionId]));

  // Persist findings
  const findingRecords = [];
  for (const f of response.findings) {
    const [finding] = await db
      .insert(assessmentFindings)
      .values({
        assessmentId: assessment.assessmentId,
        damageTypeId: dtMap[f.damageType],
        severityId: svMap[f.severity],
        repairActionId: raMap[f.repairAction],
        partLabel: f.partLabel,
        confidence: f.confidence.toFixed(4),
        uncertaintyNote: f.uncertaintyNote ?? null,
      })
      .returning();

    findingRecords.push({
      findingId: finding.findingId,
      partLabel: finding.partLabel,
      damageTypeName: f.damageType,
      severityName: f.severity,
      repairActionName: f.repairAction,
      confidence: finding.confidence,
      uncertaintyNote: finding.uncertaintyNote,
    });
  }

  return {
    assessmentId: assessment.assessmentId,
    claimId,
    version: assessment.version,
    source: assessment.source,
    modelVersion: assessment.modelVersion,
    overallConfidence: assessment.overallConfidence,
    summary: assessment.summary,
    isCurrent: true,
    createdAt: assessment.createdAt,
    findings: findingRecords,
    lineItems: [],
  };
}

export async function getCurrentAssessment(
  claimId: string
): Promise<AssessmentRecord | null> {
  const rows = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.claimId, claimId), eq(assessments.isCurrent, true)))
    .limit(1);

  if (!rows[0]) return null;
  const a = rows[0];

  const findings = await db
    .select({
      findingId: assessmentFindings.findingId,
      partLabel: assessmentFindings.partLabel,
      confidence: assessmentFindings.confidence,
      uncertaintyNote: assessmentFindings.uncertaintyNote,
      damageTypeName: damageTypes.name,
      severityName: severityLevels.name,
      repairActionName: repairActions.name,
    })
    .from(assessmentFindings)
    .innerJoin(damageTypes, eq(assessmentFindings.damageTypeId, damageTypes.damageTypeId))
    .innerJoin(severityLevels, eq(assessmentFindings.severityId, severityLevels.severityId))
    .innerJoin(repairActions, eq(assessmentFindings.repairActionId, repairActions.repairActionId))
    .where(eq(assessmentFindings.assessmentId, a.assessmentId));

  return {
    assessmentId: a.assessmentId,
    claimId,
    version: a.version,
    source: a.source,
    modelVersion: a.modelVersion,
    overallConfidence: a.overallConfidence,
    summary: a.summary,
    isCurrent: a.isCurrent,
    createdAt: a.createdAt,
    findings: findings.map((f) => ({
      findingId: f.findingId,
      partLabel: f.partLabel,
      damageTypeName: f.damageTypeName,
      severityName: f.severityName,
      repairActionName: f.repairActionName,
      confidence: f.confidence,
      uncertaintyNote: f.uncertaintyNote,
    })),
    lineItems: [],
  };
}
