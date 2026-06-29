import { db } from "@/db";
import {
  claims,
  claimPhotos,
  claimStatuses,
  photoTypes,
  vehicles,
  policies,
  agentReviews,
  reviewDecisions,
  findingCorrections,
} from "@/db/schema/claims";
import {
  assessments,
  assessmentFindings,
  damageTypes,
  severityLevels,
  repairActions,
} from "@/db/schema/assessment";
import { estimateLineItems } from "@/db/schema/estimate";
import { routingDecisions, routingTiers } from "@/db/schema/routing";
import { users } from "@/db/schema/auth";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { ClaimDetail, ClaimSummary } from "./types";
import type { CreateClaimInput, ReviewClaimInput } from "@/shared/schemas";
import type { SessionUser } from "@/auth";
import { LABOR_RATE } from "@/modules/estimate/internal/pricing";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getStatusId(name: string): Promise<number> {
  const rows = await db
    .select()
    .from(claimStatuses)
    .where(eq(claimStatuses.name, name))
    .limit(1);
  if (!rows[0]) throw new Error(`Unknown status: ${name}`);
  return rows[0].statusId;
}

async function generateClaimNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CLM-${year}-`;
  const existing = await db
    .select({ claimNumber: claims.claimNumber })
    .from(claims)
    .orderBy(desc(claims.createdAt))
    .limit(100);
  const nums = existing
    .map((r) => r.claimNumber)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ── Public service functions ───────────────────────────────────────────────────

export async function createClaim(
  input: CreateClaimInput,
  actorUser: SessionUser
): Promise<string> {
  const statusId = await getStatusId("ready_for_assessment");
  const claimNumber = await generateClaimNumber();

  const [claim] = await db
    .insert(claims)
    .values({
      claimNumber,
      vehicleId: input.vehicleId,
      reportedByUserId: actorUser.userId,
      assignedAgentId: actorUser.role === "agent" ? actorUser.userId : null,
      statusId,
      incidentDate: input.incidentDate,
      incidentDescription: input.incidentDescription,
      fraudFlagged: false,
      updatedBy: actorUser.userId,
    })
    .returning();

  // Load photo type map
  const ptRows = await db.select().from(photoTypes);
  const ptMap = Object.fromEntries(ptRows.map((r) => [r.name, r.photoTypeId]));

  for (const photo of input.photos) {
    const photoTypeId = ptMap[photo.photoTypeName] ?? ptMap["detail"];
    await db.insert(claimPhotos).values({
      claimId: claim.claimId,
      photoTypeId,
      uploadedByUserId: actorUser.userId,
      storageUrl: photo.url,
      qualityCheckPassed: true, // quality check stubbed as pass
    });
  }

  return claim.claimId;
}

export async function markAssessed(claimId: string, actorUserId: number): Promise<void> {
  const statusId = await getStatusId("assessed");
  await db
    .update(claims)
    .set({ statusId, updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(claims.claimId, claimId));
}

export async function markRouted(claimId: string, actorUserId: number): Promise<void> {
  const statusId = await getStatusId("routed");
  await db
    .update(claims)
    .set({ statusId, updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(claims.claimId, claimId));
}

export async function markAutoApproved(claimId: string, actorUserId: number): Promise<void> {
  const statusId = await getStatusId("approved");
  await db
    .update(claims)
    .set({ statusId, updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(claims.claimId, claimId));
}

export async function submitReview(
  claimId: string,
  assessmentId: string,
  input: ReviewClaimInput,
  actor: SessionUser
): Promise<number> {
  // Resolve decision id
  const decisionRows = await db
    .select()
    .from(reviewDecisions)
    .where(eq(reviewDecisions.name, input.decision))
    .limit(1);
  if (!decisionRows[0]) throw new Error("Unknown decision");

  const [review] = await db
    .insert(agentReviews)
    .values({
      claimId,
      assessmentId,
      reviewerUserId: actor.userId,
      decisionId: decisionRows[0].decisionId,
      finalTotal: input.finalTotal,
      notes: input.notes ?? null,
    })
    .returning();

  // Persist corrections
  if (input.corrections && input.corrections.length > 0) {
    for (const c of input.corrections) {
      await db.insert(findingCorrections).values({
        reviewId: review.reviewId,
        findingId: c.findingId,
        correctedSeverityId: c.correctedSeverityId ?? null,
        correctedRepairActionId: c.correctedRepairActionId ?? null,
        correctedPartLabel: c.correctedPartLabel ?? null,
        note: c.note ?? null,
      });
    }
  }

  // Update claim status
  const nextStatus =
    input.decision === "approved"
      ? "approved"
      : input.decision === "denied"
        ? "denied"
        : "escalated";

  const statusId = await getStatusId(nextStatus);
  await db
    .update(claims)
    .set({ statusId, updatedBy: actor.userId, updatedAt: new Date() })
    .where(eq(claims.claimId, claimId));

  return review.reviewId;
}

export async function listClaims(actor: SessionUser): Promise<ClaimSummary[]> {
  // Latest routing decision per claim (subquery approach: load all and de-dup in JS)
  const base = await db
    .select({
      claimId: claims.claimId,
      claimNumber: claims.claimNumber,
      statusName: claimStatuses.name,
      incidentDate: claims.incidentDate,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
      fraudFlagged: claims.fraudFlagged,
      assignedAgentId: claims.assignedAgentId,
      reportedByUserId: claims.reportedByUserId,
    })
    .from(claims)
    .innerJoin(claimStatuses, eq(claims.statusId, claimStatuses.statusId))
    .innerJoin(vehicles, eq(claims.vehicleId, vehicles.vehicleId))
    .orderBy(desc(claims.createdAt));

  // Filter by role
  const filtered = base.filter((row) => {
    if (actor.role === "customer") return row.reportedByUserId === actor.userId;
    if (actor.role === "agent") return row.assignedAgentId === actor.userId;
    return true; // supervisor sees all
  });

  if (filtered.length === 0) return [];

  // Load routing decisions for these claims
  const claimIds = filtered.map((r) => r.claimId);
  const routingRows = await db
    .select({
      claimId: routingDecisions.claimId,
      tierName: routingTiers.name,
      estimateSnapshot: routingDecisions.estimateSnapshot,
      decidedAt: routingDecisions.decidedAt,
    })
    .from(routingDecisions)
    .innerJoin(routingTiers, eq(routingDecisions.tierId, routingTiers.tierId))
    .where(inArray(routingDecisions.claimId, claimIds));

  // Keep latest routing decision per claim
  const routingMap = new Map<
    string,
    { tierName: string; estimateSnapshot: string }
  >();
  for (const r of routingRows) {
    const existing = routingMap.get(r.claimId);
    if (
      !existing ||
      (r.decidedAt && (!existing || true)) // just take last inserted
    ) {
      routingMap.set(r.claimId, {
        tierName: r.tierName,
        estimateSnapshot: r.estimateSnapshot,
      });
    }
  }

  return filtered.map((row) => {
    const routing = routingMap.get(row.claimId);
    return {
      claimId: row.claimId,
      claimNumber: row.claimNumber,
      status: row.statusName,
      routingTier: routing?.tierName ?? null,
      estimateTotal: routing?.estimateSnapshot ?? null,
      incidentDate: row.incidentDate,
      vehicleMake: row.vehicleMake,
      vehicleModel: row.vehicleModel,
      vehicleYear: row.vehicleYear,
      fraudFlagged: row.fraudFlagged,
      assignedAgentId: row.assignedAgentId,
    };
  });
}

export async function getClaimDetail(
  claimId: string,
  actor: SessionUser
): Promise<ClaimDetail | null> {
  const rows = await db
    .select({
      claimId: claims.claimId,
      claimNumber: claims.claimNumber,
      statusName: claimStatuses.name,
      incidentDate: claims.incidentDate,
      incidentDescription: claims.incidentDescription,
      fraudFlagged: claims.fraudFlagged,
      reportedByUserId: claims.reportedByUserId,
      assignedAgentId: claims.assignedAgentId,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
      vehicleVin: vehicles.vin,
      vehicleValue: vehicles.value,
    })
    .from(claims)
    .innerJoin(claimStatuses, eq(claims.statusId, claimStatuses.statusId))
    .innerJoin(vehicles, eq(claims.vehicleId, vehicles.vehicleId))
    .where(eq(claims.claimId, claimId))
    .limit(1);

  if (!rows[0]) return null;
  const row = rows[0];

  // Role-based access
  if (actor.role === "customer" && row.reportedByUserId !== actor.userId) return null;
  if (actor.role === "agent" && row.assignedAgentId !== actor.userId) return null;

  // Photos
  const photos = await db
    .select({
      photoId: claimPhotos.photoId,
      storageUrl: claimPhotos.storageUrl,
      photoTypeName: photoTypes.name,
      qualityCheckPassed: claimPhotos.qualityCheckPassed,
    })
    .from(claimPhotos)
    .innerJoin(photoTypes, eq(claimPhotos.photoTypeId, photoTypes.photoTypeId))
    .where(eq(claimPhotos.claimId, claimId));

  // Current assessment
  const assessmentRows = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.claimId, claimId), eq(assessments.isCurrent, true)))
    .limit(1);

  let assessment = null;
  if (assessmentRows[0]) {
    const a = assessmentRows[0];

    const findings = await db
      .select({
        findingId: assessmentFindings.findingId,
        partLabel: assessmentFindings.partLabel,
        confidence: assessmentFindings.confidence,
        uncertaintyNote: assessmentFindings.uncertaintyNote,
        damageType: damageTypes.name,
        severity: severityLevels.name,
        repairAction: repairActions.name,
      })
      .from(assessmentFindings)
      .innerJoin(damageTypes, eq(assessmentFindings.damageTypeId, damageTypes.damageTypeId))
      .innerJoin(severityLevels, eq(assessmentFindings.severityId, severityLevels.severityId))
      .innerJoin(repairActions, eq(assessmentFindings.repairActionId, repairActions.repairActionId))
      .where(eq(assessmentFindings.assessmentId, a.assessmentId));

    // Load corrections for this assessment's findings (from most recent review)
    const reviewRows = await db
      .select()
      .from(agentReviews)
      .where(and(eq(agentReviews.claimId, claimId), eq(agentReviews.assessmentId, a.assessmentId)))
      .orderBy(desc(agentReviews.reviewedAt))
      .limit(1);

    const correctionMap = new Map<number, (typeof findingCorrections.$inferSelect)>();
    if (reviewRows[0]) {
      const corrections = await db
        .select()
        .from(findingCorrections)
        .where(eq(findingCorrections.reviewId, reviewRows[0].reviewId));
      for (const c of corrections) correctionMap.set(c.findingId, c);
    }

    const lineItems = await db
      .select()
      .from(estimateLineItems)
      .where(eq(estimateLineItems.assessmentId, a.assessmentId));

    let estimateTotal = 0;
    const lineItemRecords = lineItems.map((li) => {
      const lt = parseFloat(li.partCost) + parseFloat(li.laborHours) * parseFloat(li.laborRate);
      estimateTotal += lt;
      return {
        lineItemId: li.lineItemId,
        description: li.description,
        partCost: li.partCost,
        laborHours: li.laborHours,
        laborRate: li.laborRate,
        lineTotal: lt.toFixed(2),
      };
    });

    const vehicleValue = parseFloat(row.vehicleValue);
    const possibleTotalLoss =
      vehicleValue > 0 && estimateTotal / vehicleValue >= 0.75;

    assessment = {
      assessmentId: a.assessmentId,
      version: a.version,
      source: a.source,
      modelVersion: a.modelVersion,
      overallConfidence: a.overallConfidence,
      summary: a.summary,
      isCurrent: a.isCurrent,
      createdAt: a.createdAt.toISOString(),
      findings: findings.map((f) => {
        const correction = correctionMap.get(f.findingId) ?? null;
        return {
          findingId: f.findingId,
          partLabel: f.partLabel,
          damageType: f.damageType,
          severity: f.severity,
          repairAction: f.repairAction,
          confidence: f.confidence,
          uncertaintyNote: f.uncertaintyNote,
          correction: correction
            ? {
                correctedSeverityId: correction.correctedSeverityId,
                correctedRepairActionId: correction.correctedRepairActionId,
                correctedPartLabel: correction.correctedPartLabel,
                note: correction.note,
              }
            : null,
        };
      }),
      lineItems: lineItemRecords,
      estimateTotal: estimateTotal.toFixed(2),
      possibleTotalLoss,
    };
  }

  // Routing decision
  const routingRows = await db
    .select({
      routingId: routingDecisions.routingId,
      tierName: routingTiers.name,
      confidenceSnapshot: routingDecisions.confidenceSnapshot,
      estimateSnapshot: routingDecisions.estimateSnapshot,
      fraudFlagged: routingDecisions.fraudFlagged,
      triggeredBy: routingDecisions.triggeredBy,
      decidedAt: routingDecisions.decidedAt,
    })
    .from(routingDecisions)
    .innerJoin(routingTiers, eq(routingDecisions.tierId, routingTiers.tierId))
    .where(eq(routingDecisions.claimId, claimId))
    .orderBy(desc(routingDecisions.decidedAt))
    .limit(1);

  const routing = routingRows[0]
    ? {
        routingId: routingRows[0].routingId,
        tier: routingRows[0].tierName,
        confidenceSnapshot: routingRows[0].confidenceSnapshot,
        estimateSnapshot: routingRows[0].estimateSnapshot,
        fraudFlagged: routingRows[0].fraudFlagged,
        triggeredBy: routingRows[0].triggeredBy,
        decidedAt: routingRows[0].decidedAt.toISOString(),
      }
    : null;

  // Latest review
  const reviewRows2 = await db
    .select({
      reviewId: agentReviews.reviewId,
      decisionName: reviewDecisions.name,
      finalTotal: agentReviews.finalTotal,
      notes: agentReviews.notes,
      reviewedAt: agentReviews.reviewedAt,
    })
    .from(agentReviews)
    .innerJoin(reviewDecisions, eq(agentReviews.decisionId, reviewDecisions.decisionId))
    .where(eq(agentReviews.claimId, claimId))
    .orderBy(desc(agentReviews.reviewedAt))
    .limit(1);

  const review = reviewRows2[0]
    ? {
        reviewId: reviewRows2[0].reviewId,
        decision: reviewRows2[0].decisionName,
        finalTotal: reviewRows2[0].finalTotal,
        notes: reviewRows2[0].notes,
        reviewedAt: reviewRows2[0].reviewedAt.toISOString(),
      }
    : null;

  return {
    claimId: row.claimId,
    claimNumber: row.claimNumber,
    status: row.statusName,
    routingTier: routing?.tier ?? null,
    estimateTotal: routing?.estimateSnapshot ?? null,
    incidentDate: row.incidentDate,
    vehicleMake: row.vehicleMake,
    vehicleModel: row.vehicleModel,
    vehicleYear: row.vehicleYear,
    fraudFlagged: row.fraudFlagged,
    assignedAgentId: row.assignedAgentId,
    vehicleVin: row.vehicleVin,
    vehicleValue: row.vehicleValue,
    incidentDescription: row.incidentDescription,
    reportedByUserId: row.reportedByUserId,
    photos,
    assessment,
    routing,
    review,
  };
}

export async function listVehiclesForUser(userId: number) {
  return db
    .select({
      vehicleId: vehicles.vehicleId,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      vin: vehicles.vin,
      value: vehicles.value,
    })
    .from(vehicles)
    .innerJoin(policies, eq(vehicles.policyId, policies.policyId))
    .where(eq(policies.customerId, userId));
}
