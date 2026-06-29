import type { NextRequest } from "next/server";
import { getSession, requireRole, handleApiError } from "@/auth";
import { runAssessment } from "@/modules/assessment/interface";
import { generateEstimate } from "@/modules/estimate/interface";
import { routeClaim } from "@/modules/routing/interface";
import {
  markAssessed,
  markRouted,
  markAutoApproved,
  getClaimDetail,
} from "@/modules/claims/interface";
import { recordEvent } from "@/modules/audit/interface";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "agent");
    const { id: claimId } = await params;

    // Verify claim exists and is in the right state
    const claim = await getClaimDetail(claimId, user);
    if (!claim) return Response.json({ error: "Not found" }, { status: 404 });
    if (claim.status !== "ready_for_assessment") {
      return Response.json(
        { error: `Claim is in '${claim.status}' status, expected 'ready_for_assessment'` },
        { status: 422 }
      );
    }

    // 1. Run assessment (mock or real)
    const assessment = await runAssessment(claimId);
    await markAssessed(claimId, user.userId);

    // 2. Generate estimate
    const estimate = await generateEstimate(assessment.assessmentId, claimId);

    // 3. Route
    const routing = await routeClaim({
      claimId,
      assessmentId: assessment.assessmentId,
      overallConfidence: parseFloat(assessment.overallConfidence),
      estimateTotal: parseFloat(estimate.total),
      fraudFlagged: claim.fraudFlagged,
      possibleTotalLoss: estimate.possibleTotalLoss,
    });
    await markRouted(claimId, user.userId);

    // 4. Auto-approve if eligible
    let autoApproved = false;
    if (
      routing.tierName === "auto_approved" &&
      process.env.ENABLE_AUTO_APPROVE === "true"
    ) {
      await markAutoApproved(claimId, user.userId);
      autoApproved = true;
    }

    // 5. Audit
    await recordEvent({
      claimId,
      actorUserId: user.userId,
      actorType: user.role,
      action: autoApproved ? "claim_auto_approved" : "claim_assessed",
      entityType: "assessment",
      entityId: 0,
      detail: {
        assessmentId: assessment.assessmentId,
        overallConfidence: assessment.overallConfidence,
        estimateTotal: estimate.total,
        tier: routing.tierName,
        autoApproved,
      },
    });

    return Response.json({
      assessmentId: assessment.assessmentId,
      overallConfidence: assessment.overallConfidence,
      summary: assessment.summary,
      findings: assessment.findings,
      estimate: {
        lineItems: estimate.lineItems,
        total: estimate.total,
        possibleTotalLoss: estimate.possibleTotalLoss,
      },
      routing: {
        tier: routing.tierName,
        triggeredBy: routing.triggeredBy,
        confidenceSnapshot: routing.confidenceSnapshot,
        estimateSnapshot: routing.estimateSnapshot,
      },
      autoApproved,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
