import type { NextRequest } from "next/server";
import { getSession, requireRole, handleApiError } from "@/auth";
import { getClaimDetail } from "@/modules/claims/interface";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    requireRole(user, "customer");
    const { id } = await params;
    const detail = await getClaimDetail(id, user);
    if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(detail);
  } catch (error) {
    return handleApiError(error);
  }
}
