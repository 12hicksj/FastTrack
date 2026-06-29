import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { roles } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

// Public endpoint — returns the three seeded demo accounts for the role switcher
export async function GET() {
  const rows = await db
    .select({
      userId: users.userId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(eq(users.isActive, true));

  return Response.json(rows);
}
