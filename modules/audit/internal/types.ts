export interface AuditEventInput {
  claimId: string;
  actorUserId: number;
  actorType: string;
  action: string;
  entityType: string;
  entityId: number;
  detail: Record<string, unknown>;
}
