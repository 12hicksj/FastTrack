import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  boolean,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { claims } from "./claims";
import { assessments } from "./assessment";

export const routingTiers = pgTable("routing_tiers", {
  tierId: serial("tier_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const routingThresholds = pgTable("routing_thresholds", {
  thresholdId: serial("threshold_id").primaryKey(),
  name: text("name").notNull().unique(),
  value: numeric("value", { precision: 10, scale: 4 }).notNull(),
});

export const routingDecisions = pgTable(
  "routing_decisions",
  {
    routingId: serial("routing_id").primaryKey(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.claimId),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.assessmentId),
    tierId: integer("tier_id")
      .notNull()
      .references(() => routingTiers.tierId),
    confidenceSnapshot: numeric("confidence_snapshot", {
      precision: 5,
      scale: 4,
    }).notNull(),
    estimateSnapshot: numeric("estimate_snapshot", {
      precision: 10,
      scale: 2,
    }).notNull(),
    fraudFlagged: boolean("fraud_flagged").notNull().default(false),
    triggeredBy: text("triggered_by").notNull(),
    decidedAt: timestamp("decided_at").notNull().defaultNow(),
  },
  (t) => [index("routing_decisions_claim_id_idx").on(t.claimId)]
);
