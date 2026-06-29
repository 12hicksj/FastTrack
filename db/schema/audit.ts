import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { claims } from "./claims";
import { users } from "./auth";

export const auditEvents = pgTable(
  "audit_events",
  {
    eventId: serial("event_id").primaryKey(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.claimId),
    actorUserId: integer("actor_user_id")
      .notNull()
      .references(() => users.userId),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    detail: jsonb("detail").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_events_claim_id_idx").on(t.claimId)]
);
