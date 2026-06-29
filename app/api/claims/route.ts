import type { NextRequest } from "next/server";
import { getSession, requireRole, handleApiError } from "@/auth";
import { CreateClaimSchema } from "@/shared/schemas";
import { createClaim, listClaims, markAssessed, markRouted, markAutoApproved } from "@/modules/claims/interface";
import { runAssessment } from "@/modules/assessment/interface";
import { generateEstimate } from "@/modules/estimate/interface";
import { routeClaim } from "@/modules/routing/interface";
import { recordEvent } from "@/modules/audit/interface";

export async function GET() {
  try {
    const user = await getSession();
    requireRole(user, "customer");
    const queue = await listClaims(user);
    return Response.json(queue);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    requireRole(user, "customer");

    const body = await request.json();
    const input = CreateClaimSchema.parse(body);

    const claimId = await createClaim(input, user);

    await recordEvent({
      claimId,
      actorUserId: user.userId,
      actorType: user.role,
      action: "claim_created",
      entityType: "claim",
      entityId: 0,
      detail: { claimId, photoCount: input.photos.length },
    });

    // ── Automated pipeline: assess → estimate → route → auto-approve ──────────
    let pipelineResult: {
      tier: string;
      estimateTotal: string;
      autoApproved: boolean;
    } | null = null;

    try {
      const assessment = await runAssessment(claimId);
      await markAssessed(claimId, user.userId);

      const estimate = await generateEstimate(assessment.assessmentId, claimId);

      const routing = await routeClaim({
        claimId,
        assessmentId: assessment.assessmentId,
        overallConfidence: parseFloat(assessment.overallConfidence),
        estimateTotal: parseFloat(estimate.total),
        fraudFlagged: false, // newly created claims are never pre-flagged
        possibleTotalLoss: estimate.possibleTotalLoss,
      });
      await markRouted(claimId, user.userId);

      let autoApproved = false;
      if (routing.tierName === "auto_approved") {
        await markAutoApproved(claimId, user.userId);
        autoApproved = true;
      }

      await recordEvent({
        claimId,
        actorUserId: user.userId,
        actorType: "system",
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

      pipelineResult = {
        tier: routing.tierName,
        estimateTotal: estimate.total,
        autoApproved,
      };
    } catch (pipelineErr) {
      // Assessment failure is non-fatal — claim is created, agent can assess manually
      console.error("[claims/POST] Auto-assessment failed:", pipelineErr);
    }

    return Response.json({ claimId, pipeline: pipelineResult }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
