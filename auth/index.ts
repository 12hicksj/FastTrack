// Mock session + role-check auth layer. Full implementation in Phase 3.
export type Role = "customer" | "agent" | "supervisor";

export interface SessionUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export async function getSession(
  _req?: Request
): Promise<SessionUser | null> {
  // Implemented in Phase 3
  return null;
}

export function requireRole(
  _user: SessionUser | null,
  _role: Role
): asserts _user is SessionUser {
  // Implemented in Phase 3
}
