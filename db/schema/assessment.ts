import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { claims } from "./claims";

export const damageTypes = pgTable("damage_types", {
  damageTypeId: serial("damage_type_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const severityLevels = pgTable("severity_levels", {
  severityId: serial("severity_id").primaryKey(),
  name: text("name").notNull().unique(),
  rank: integer("rank").notNull(),
});

export const repairActions = pgTable("repair_actions", {
  repairActionId: serial("repair_action_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const assessments = pgTable(
  "assessments",
  {
    assessmentId: uuid("assessment_id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.claimId),
    version: integer("version").notNull().default(1),
    source: text("source").notNull(),
    modelVersion: text("model_version").notNull(),
    overallConfidence: numeric("overall_confidence", {
      precision: 5,
      scale: 4,
    }).notNull(),
    summary: text("summary").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("assessments_claim_id_idx").on(t.claimId)]
);

export const assessmentFindings = pgTable(
  "assessment_findings",
  {
    findingId: serial("finding_id").primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.assessmentId),
    damageTypeId: integer("damage_type_id")
      .notNull()
      .references(() => damageTypes.damageTypeId),
    severityId: integer("severity_id")
      .notNull()
      .references(() => severityLevels.severityId),
    repairActionId: integer("repair_action_id")
      .notNull()
      .references(() => repairActions.repairActionId),
    partLabel: text("part_label").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
    uncertaintyNote: text("uncertainty_note"),
  },
  (t) => [index("findings_assessment_id_idx").on(t.assessmentId)]
);
