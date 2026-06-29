import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { makeSessionValue, COOKIE_NAME, handleApiError } from "@/auth";
import { SwitchRoleSchema } from "@/shared/schemas";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = SwitchRoleSchema.parse(body);

    // Verify user exists and is active
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!rows[0] || !rows[0].isActive) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, makeSessionValue(userId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return Response.json({ ok: true, userId });
  } catch (error) {
    return handleApiError(error);
  }
}
