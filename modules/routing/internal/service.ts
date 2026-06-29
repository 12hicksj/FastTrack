import { db } from "@/db";
import { routingDecisions, routingTiers, routingThresholds } from "@/db/schema/routing";
import { eq } from "drizzle-orm";
import type { RoutingResult } from "./types";
import { determineTier } from "./rules";

export type { RoutingTierName } from "./rules";
export { determineTier } from "./rules";

export interface RoutingInput {
  claimId: string;
  assessmentId: string;
  overallConfidence: number;
  estimateTotal: number;
  fraudFlagged: boolean;
  possibleTotalLoss: boolean;
}

async function loadThresholds() {
  const rows = await db.select().from(routingThresholds);
  const map = Object.fromEntries(rows.map((r) => [r.name, parseFloat(r.value)]));
  return {
    confidenceMinAutoApprove: map["confidence_min_auto_approve"] ?? 0.9,
    costMaxAutoApprove: map["cost_max_auto_approve"] ?? 2500,
    costMinSupervisor: map["cost_min_supervisor"] ?? 10000,
  };
}

export async function routeClaim(input: RoutingInput): Promise<RoutingResult> {
  const thresholds = await loadThresholds();

  const tierName = determineTier({
    confidence: input.overallConfidence,
    estimateTotal: input.estimateTotal,
    fraudFlagged: input.fraudFlagged,
    possibleTotalLoss: input.possibleTotalLoss,
    thresholds,
  });

  let triggeredBy: string;
  if (input.fraudFlagged) {
    triggeredBy = "fraud_flag";
  } else if (input.possibleTotalLoss) {
    triggeredBy = "possible_total_loss";
  } else if (input.estimateTotal >= thresholds.costMinSupervisor) {
    triggeredBy = "estimate_exceeds_threshold";
  } else if (
    input.overallConfidence >= thresholds.confidenceMinAutoApprove &&
    input.estimateTotal <= thresholds.costMaxAutoApprove
  ) {
    triggeredBy = "confidence_and_cost_within_threshold";
  } else {
    triggeredBy = "confidence_below_threshold";
  }

  const tierRows = await db
    .select()
    .from(routingTiers)
    .where(eq(routingTiers.name, tierName))
    .limit(1);

  const [decision] = await db
    .insert(routingDecisions)
    .values({
      claimId: input.claimId,
      assessmentId: input.assessmentId,
      tierId: tierRows[0].tierId,
      confidenceSnapshot: input.overallConfidence.toFixed(4),
      estimateSnapshot: input.estimateTotal.toFixed(2),
      fraudFlagged: input.fraudFlagged,
      triggeredBy,
    })
    .returning();

  return {
    routingId: decision.routingId,
    claimId: input.claimId,
    tierName,
    confidenceSnapshot: decision.confidenceSnapshot,
    estimateSnapshot: decision.estimateSnapshot,
    fraudFlagged: decision.fraudFlagged,
    triggeredBy: decision.triggeredBy,
    decidedAt: decision.decidedAt,
  };
}

export async function getRoutingDecision(claimId: string): Promise<RoutingResult | null> {
  const rows = await db
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
    .orderBy(routingDecisions.decidedAt)
    .limit(1);

  if (!rows[0]) return null;
  return { ...rows[0], claimId };
}
