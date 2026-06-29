import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { roles } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

export type Role = "customer" | "agent" | "supervisor";

export interface SessionUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const COOKIE_NAME = "ft_session";
// Role hierarchy: higher index = more privilege
const ROLE_RANK: Record<Role, number> = { customer: 0, agent: 1, supervisor: 2 };

function sign(userId: number): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(String(userId))
    .digest("hex");
}

function parseCookie(value: string): number | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const idStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const userId = parseInt(idStr, 10);
  if (isNaN(userId)) return null;
  if (sig !== sign(userId)) return null;
  return userId;
}

export function makeSessionValue(userId: number): string {
  return `${userId}.${sign(userId)}`;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;

  const userId = parseCookie(cookie.value);
  if (!userId) return null;

  const rows = await db
    .select({
      userId: users.userId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleName: roles.name,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(eq(users.userId, userId))
    .limit(1);

  if (!rows[0] || !rows[0].isActive) return null;

  return {
    userId: rows[0].userId,
    email: rows[0].email,
    firstName: rows[0].firstName,
    lastName: rows[0].lastName,
    role: rows[0].roleName as Role,
  };
}

export function requireAuth(user: SessionUser | null): asserts user is SessionUser {
  if (!user) throw new AuthError(401, "Not authenticated");
}

export function requireRole(
  user: SessionUser | null,
  minRole: Role
): asserts user is SessionUser {
  requireAuth(user);
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw new AuthError(403, "Insufficient permissions");
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

export { COOKIE_NAME };
