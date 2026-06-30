import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  assessments,
  assessmentFindings,
  damageTypes,
  severityLevels,
  repairActions,
} from "./assessment";

export const claimStatuses = pgTable("claim_statuses", {
  statusId: serial("status_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const photoTypes = pgTable("photo_types", {
  photoTypeId: serial("photo_type_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const reviewDecisions = pgTable("review_decisions", {
  decisionId: serial("decision_id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const policies = pgTable("policies", {
  policyId: serial("policy_id").primaryKey(),
  policyNumber: text("policy_number").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => users.userId),
  effectiveDate: date("effective_date").notNull(),
  expirationDate: date("expiration_date").notNull(),
});

export const vehicles = pgTable("vehicles", {
  vehicleId: serial("vehicle_id").primaryKey(),
  policyId: integer("policy_id")
    .notNull()
    .references(() => policies.policyId),
  vin: text("vin").notNull().unique(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  licensePlate: text("license_plate").notNull(),
});

export const claims = pgTable(
  "claims",
  {
    claimId: uuid("claim_id").primaryKey().defaultRandom(),
    claimNumber: text("claim_number").notNull().unique(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.vehicleId),
    reportedByUserId: integer("reported_by_user_id")
      .notNull()
      .references(() => users.userId),
    assignedAgentId: integer("assigned_agent_id").references(
      () => users.userId
    ),
    statusId: integer("status_id")
      .notNull()
      .references(() => claimStatuses.statusId),
    incidentDate: date("incident_date").notNull(),
    incidentDescription: text("incident_description").notNull(),
    fraudFlagged: boolean("fraud_flagged").notNull().default(false),
    updatedBy: integer("updated_by").references(() => users.userId),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("claims_agent_status_idx").on(t.assignedAgentId, t.statusId)]
);

export const claimPhotos = pgTable(
  "claim_photos",
  {
    photoId: serial("photo_id").primaryKey(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.claimId),
    photoTypeId: integer("photo_type_id")
      .notNull()
      .references(() => photoTypes.photoTypeId),
    uploadedByUserId: integer("uploaded_by_user_id")
      .notNull()
      .references(() => users.userId),
    storageUrl: text("storage_url").notNull(),
    qualityCheckPassed: boolean("quality_check_passed").notNull().default(true),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  },
  (t) => [index("photos_claim_id_idx").on(t.claimId)]
);

export const agentReviews = pgTable("agent_reviews", {
  reviewId: serial("review_id").primaryKey(),
  claimId: uuid("claim_id")
    .notNull()
    .references(() => claims.claimId),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.assessmentId),
  reviewerUserId: integer("reviewer_user_id")
    .notNull()
    .references(() => users.userId),
  decisionId: integer("decision_id")
    .notNull()
    .references(() => reviewDecisions.decisionId),
  finalTotal: numeric("final_total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
});

export const findingCorrections = pgTable("finding_corrections", {
  correctionId: serial("correction_id").primaryKey(),
  reviewId: integer("review_id")
    .notNull()
    .references(() => agentReviews.reviewId),
  findingId: integer("finding_id")
    .notNull()
    .references(() => assessmentFindings.findingId),
  correctedDamageTypeId: integer("corrected_damage_type_id").references(
    () => damageTypes.damageTypeId
  ),
  correctedSeverityId: integer("corrected_severity_id").references(
    () => severityLevels.severityId
  ),
  correctedRepairActionId: integer("corrected_repair_action_id").references(
    () => repairActions.repairActionId
  ),
  correctedPartLabel: text("corrected_part_label"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
