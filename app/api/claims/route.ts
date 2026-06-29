import type { NextRequest } from "next/server";
import { getSession, requireRole, handleApiError } from "@/auth";
import { CreateClaimSchema } from "@/shared/schemas";
import { createClaim, listClaims } from "@/modules/claims/interface";
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

    return Response.json({ claimId }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
