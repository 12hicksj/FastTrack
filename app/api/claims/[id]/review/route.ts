import type { NextRequest } from "next/server";
import { getSession, requireRole, handleApiError } from "@/auth";
import { ReviewClaimSchema } from "@/shared/schemas";
import { submitReview, getClaimDetail } from "@/modules/claims/interface";
import { recordEvent } from "@/modules/audit/interface";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "agent");
    const { id: claimId } = await params;

    const body = await request.json();
    const input = ReviewClaimSchema.parse(body);

    // Verify claim exists and is reviewable
    const claim = await getClaimDetail(claimId, user);
    if (!claim) return Response.json({ error: "Not found" }, { status: 404 });

    const reviewableStatuses = ["routed", "in_review", "escalated"];
    if (!reviewableStatuses.includes(claim.status)) {
      return Response.json(
        { error: `Claim status '${claim.status}' is not reviewable` },
        { status: 422 }
      );
    }

    if (!claim.assessment) {
      return Response.json({ error: "Claim has no assessment" }, { status: 422 });
    }

    const reviewId = await submitReview(
      claimId,
      claim.assessment.assessmentId,
      input,
      user
    );

    await recordEvent({
      claimId,
      actorUserId: user.userId,
      actorType: user.role,
      action: `claim_${input.decision}`,
      entityType: "agent_review",
      entityId: reviewId,
      detail: {
        decision: input.decision,
        finalTotal: input.finalTotal,
        correctionCount: input.corrections?.length ?? 0,
      },
    });

    return Response.json({ reviewId, decision: input.decision });
  } catch (error) {
    return handleApiError(error);
  }
}
