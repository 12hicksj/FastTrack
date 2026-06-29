CREATE TABLE "assessment_findings" (
	"finding_id" serial PRIMARY KEY NOT NULL,
	"assessment_id" uuid NOT NULL,
	"damage_type_id" integer NOT NULL,
	"severity_id" integer NOT NULL,
	"repair_action_id" integer NOT NULL,
	"part_label" text NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"uncertainty_note" text
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"assessment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"model_version" text NOT NULL,
	"overall_confidence" numeric(5, 4) NOT NULL,
	"summary" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "damage_types" (
	"damage_type_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "damage_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "repair_actions" (
	"repair_action_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "repair_actions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "severity_levels" (
	"severity_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "severity_levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"event_id" serial PRIMARY KEY NOT NULL,
	"claim_id" uuid NOT NULL,
	"actor_user_id" integer NOT NULL,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"email" text NOT NULL,
	"auth_provider_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider_id")
);
--> statement-breakpoint
CREATE TABLE "agent_reviews" (
	"review_id" serial PRIMARY KEY NOT NULL,
	"claim_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"reviewer_user_id" integer NOT NULL,
	"decision_id" integer NOT NULL,
	"final_total" numeric(10, 2) NOT NULL,
	"notes" text,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_photos" (
	"photo_id" serial PRIMARY KEY NOT NULL,
	"claim_id" uuid NOT NULL,
	"photo_type_id" integer NOT NULL,
	"uploaded_by_user_id" integer NOT NULL,
	"storage_url" text NOT NULL,
	"quality_check_passed" boolean DEFAULT true NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_statuses" (
	"status_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "claim_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"claim_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_number" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"reported_by_user_id" integer NOT NULL,
	"assigned_agent_id" integer,
	"status_id" integer NOT NULL,
	"incident_date" date NOT NULL,
	"incident_description" text NOT NULL,
	"fraud_flagged" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claims_claim_number_unique" UNIQUE("claim_number")
);
--> statement-breakpoint
CREATE TABLE "finding_corrections" (
	"correction_id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"finding_id" integer NOT NULL,
	"corrected_severity_id" integer,
	"corrected_repair_action_id" integer,
	"corrected_part_label" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_types" (
	"photo_type_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "photo_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"policy_id" serial PRIMARY KEY NOT NULL,
	"policy_number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"effective_date" date NOT NULL,
	"expiration_date" date NOT NULL,
	CONSTRAINT "policies_policy_number_unique" UNIQUE("policy_number")
);
--> statement-breakpoint
CREATE TABLE "review_decisions" (
	"decision_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "review_decisions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"vehicle_id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"vin" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	CONSTRAINT "vehicles_vin_unique" UNIQUE("vin")
);
--> statement-breakpoint
CREATE TABLE "estimate_line_items" (
	"line_item_id" serial PRIMARY KEY NOT NULL,
	"assessment_id" uuid NOT NULL,
	"description" text NOT NULL,
	"part_cost" numeric(10, 2) NOT NULL,
	"labor_hours" numeric(6, 2) NOT NULL,
	"labor_rate" numeric(6, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_decisions" (
	"routing_id" serial PRIMARY KEY NOT NULL,
	"claim_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"tier_id" integer NOT NULL,
	"confidence_snapshot" numeric(5, 4) NOT NULL,
	"estimate_snapshot" numeric(10, 2) NOT NULL,
	"fraud_flagged" boolean DEFAULT false NOT NULL,
	"triggered_by" text NOT NULL,
	"decided_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_thresholds" (
	"threshold_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	CONSTRAINT "routing_thresholds_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "routing_tiers" (
	"tier_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "routing_tiers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "assessment_findings" ADD CONSTRAINT "assessment_findings_assessment_id_assessments_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("assessment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_findings" ADD CONSTRAINT "assessment_findings_damage_type_id_damage_types_damage_type_id_fk" FOREIGN KEY ("damage_type_id") REFERENCES "public"."damage_types"("damage_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_findings" ADD CONSTRAINT "assessment_findings_severity_id_severity_levels_severity_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity_levels"("severity_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_findings" ADD CONSTRAINT "assessment_findings_repair_action_id_repair_actions_repair_action_id_fk" FOREIGN KEY ("repair_action_id") REFERENCES "public"."repair_actions"("repair_action_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_claim_id_claims_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("claim_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_claim_id_claims_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("claim_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_claim_id_claims_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("claim_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_assessment_id_assessments_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("assessment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_reviewer_user_id_users_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_decision_id_review_decisions_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."review_decisions"("decision_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_photos" ADD CONSTRAINT "claim_photos_claim_id_claims_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("claim_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_photos" ADD CONSTRAINT "claim_photos_photo_type_id_photo_types_photo_type_id_fk" FOREIGN KEY ("photo_type_id") REFERENCES "public"."photo_types"("photo_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_photos" ADD CONSTRAINT "claim_photos_uploaded_by_user_id_users_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_reported_by_user_id_users_user_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_assigned_agent_id_users_user_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_status_id_claim_statuses_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."claim_statuses"("status_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_updated_by_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_corrections" ADD CONSTRAINT "finding_corrections_review_id_agent_reviews_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."agent_reviews"("review_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_corrections" ADD CONSTRAINT "finding_corrections_finding_id_assessment_findings_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."assessment_findings"("finding_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_corrections" ADD CONSTRAINT "finding_corrections_corrected_severity_id_severity_levels_severity_id_fk" FOREIGN KEY ("corrected_severity_id") REFERENCES "public"."severity_levels"("severity_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_corrections" ADD CONSTRAINT "finding_corrections_corrected_repair_action_id_repair_actions_repair_action_id_fk" FOREIGN KEY ("corrected_repair_action_id") REFERENCES "public"."repair_actions"("repair_action_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_customer_id_users_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_policy_id_policies_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("policy_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_assessment_id_assessments_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("assessment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_claim_id_claims_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("claim_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_assessment_id_assessments_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("assessment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_tier_id_routing_tiers_tier_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."routing_tiers"("tier_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "findings_assessment_id_idx" ON "assessment_findings" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessments_claim_id_idx" ON "assessments" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "audit_events_claim_id_idx" ON "audit_events" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "photos_claim_id_idx" ON "claim_photos" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claims_agent_status_idx" ON "claims" USING btree ("assigned_agent_id","status_id");--> statement-breakpoint
CREATE INDEX "line_items_assessment_id_idx" ON "estimate_line_items" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "routing_decisions_claim_id_idx" ON "routing_decisions" USING btree ("claim_id");