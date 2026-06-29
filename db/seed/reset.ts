import * as dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("⏳  Truncating all tables…");
  await sql`
    TRUNCATE
      audit_events,
      finding_corrections,
      agent_reviews,
      routing_decisions,
      estimate_line_items,
      assessment_findings,
      assessments,
      claim_photos,
      claims,
      vehicles,
      policies,
      users,
      routing_thresholds,
      routing_tiers,
      review_decisions,
      repair_actions,
      severity_levels,
      damage_types,
      photo_types,
      claim_statuses,
      roles
    RESTART IDENTITY CASCADE
  `;
  console.log("✅  All tables truncated.");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
