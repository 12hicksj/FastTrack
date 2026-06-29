import { db } from "@/db";
import { auditEvents } from "@/db/schema/audit";
import type { AuditEventInput } from "./types";
import { claims } from "@/db/schema/claims";
import { eq } from "drizzle-orm";

export async function recordEvent(input: AuditEventInput): Promise<void> {
  // claimId in audit_events is the UUID string; we need the integer PK from the DB
  // Since audit_events.claim_id is a UUID FK to claims.claim_id, pass the UUID directly.
  await db.insert(auditEvents).values({
    claimId: input.claimId,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    detail: input.detail,
  });
}
