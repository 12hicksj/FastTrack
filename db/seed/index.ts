/**
 * Seed script — inserts lookup data, demo users, vehicles, and the four
 * scenario claims with curated Pexels demo photos.
 *
 * Run with: npm run db:seed
 */

import * as dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import {
  roles,
  users,
  claimStatuses,
  photoTypes,
  policies,
  vehicles,
  claims,
  claimPhotos,
  reviewDecisions,
  damageTypes,
  severityLevels,
  repairActions,
  assessments,
  assessmentFindings,
  estimateLineItems,
  routingTiers,
  routingThresholds,
  routingDecisions,
} from "../schema/index";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ── Pricing table (severity × action) ────────────────────────────────────────
const LABOR_RATE = "60.00";

const PRICING: Record<string, Record<string, { partCost: string; laborHours: string }>> = {
  minor: {
    repair:  { partCost: "200.00", laborHours: "1.50" },
    replace: { partCost: "400.00", laborHours: "2.00" },
  },
  moderate: {
    repair:  { partCost: "600.00",  laborHours: "3.00" },
    replace: { partCost: "1200.00", laborHours: "4.00" },
  },
  severe: {
    repair:  { partCost: "1500.00", laborHours: "6.00" },
    replace: { partCost: "3000.00", laborHours: "8.00" },
  },
};

// ── Curated Pexels photo URL ──────────────────────────────────────────────────
const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop`;

async function main() {
  console.log("⏳  Seeding database…");

  // ── 1. Roles ────────────────────────────────────────────────────────────────
  await db.insert(roles).values([
    { name: "customer" },
    { name: "agent" },
    { name: "supervisor" },
  ]).onConflictDoNothing();

  const [customerRole, agentRole, supervisorRole] = await Promise.all([
    db.select().from(roles).where(eq(roles.name, "customer")).then(r => r[0]),
    db.select().from(roles).where(eq(roles.name, "agent")).then(r => r[0]),
    db.select().from(roles).where(eq(roles.name, "supervisor")).then(r => r[0]),
  ]);

  // ── 2. Users ────────────────────────────────────────────────────────────────
  await db.insert(users).values([
    {
      roleId: customerRole.roleId,
      email: "customer@scale.insurance",
      authProviderId: "mock|customer",
      firstName: "Alex",
      lastName: "Rivera",
      isActive: true,
    },
    {
      roleId: agentRole.roleId,
      email: "agent@scale.insurance",
      authProviderId: "mock|agent",
      firstName: "Jordan",
      lastName: "Chen",
      isActive: true,
    },
    {
      roleId: supervisorRole.roleId,
      email: "supervisor@scale.insurance",
      authProviderId: "mock|supervisor",
      firstName: "Taylor",
      lastName: "Morgan",
      isActive: true,
    },
  ]).onConflictDoNothing();

  const [customerUser, agentUser] = await Promise.all([
    db.select().from(users).where(eq(users.email, "customer@scale.insurance")).then(r => r[0]),
    db.select().from(users).where(eq(users.email, "agent@scale.insurance")).then(r => r[0]),
  ]);

  // ── 3. Claim statuses ───────────────────────────────────────────────────────
  await db.insert(claimStatuses).values([
    { name: "draft" },
    { name: "ready_for_assessment" },
    { name: "assessed" },
    { name: "routed" },
    { name: "in_review" },
    { name: "approved" },
    { name: "denied" },
    { name: "escalated" },
    { name: "closed" },
  ]).onConflictDoNothing();

  const statusMap = Object.fromEntries(
    (await db.select().from(claimStatuses)).map(s => [s.name, s.statusId])
  );

  // ── 4. Photo types ──────────────────────────────────────────────────────────
  await db.insert(photoTypes).values([
    { name: "front" },
    { name: "rear" },
    { name: "left" },
    { name: "right" },
    { name: "vin_plate" },
    { name: "odometer" },
    { name: "detail" },
  ]).onConflictDoNothing();

  const photoTypeMap = Object.fromEntries(
    (await db.select().from(photoTypes)).map(p => [p.name, p.photoTypeId])
  );

  // ── 5. Lookup tables ────────────────────────────────────────────────────────
  await db.insert(damageTypes).values([
    { name: "scratch" },
    { name: "dent" },
    { name: "structural" },
    { name: "glass" },
  ]).onConflictDoNothing();

  await db.insert(severityLevels).values([
    { name: "minor",    rank: 1 },
    { name: "moderate", rank: 2 },
    { name: "severe",   rank: 3 },
  ]).onConflictDoNothing();

  await db.insert(repairActions).values([
    { name: "repair" },
    { name: "replace" },
  ]).onConflictDoNothing();

  await db.insert(reviewDecisions).values([
    { name: "approved" },
    { name: "denied" },
    { name: "escalated" },
  ]).onConflictDoNothing();

  await db.insert(routingTiers).values([
    { name: "auto_approved" },
    { name: "agent_review" },
    { name: "senior_adjuster" },
  ]).onConflictDoNothing();

  // ── 6. Routing thresholds ───────────────────────────────────────────────────
  await db.insert(routingThresholds).values([
    { name: "confidence_min_auto_approve", value: "0.9000" },
    { name: "cost_max_auto_approve",       value: "2500.0000" },
    { name: "cost_min_supervisor",         value: "10000.0000" },
  ]).onConflictDoNothing();

  // Reload lookup maps
  const damageTypeMap = Object.fromEntries(
    (await db.select().from(damageTypes)).map(d => [d.name, d.damageTypeId])
  );
  const severityMap = Object.fromEntries(
    (await db.select().from(severityLevels)).map(s => [s.name, s.severityId])
  );
  const repairActionMap = Object.fromEntries(
    (await db.select().from(repairActions)).map(r => [r.name, r.repairActionId])
  );
  const routingTierMap = Object.fromEntries(
    (await db.select().from(routingTiers)).map(t => [t.name, t.tierId])
  );

  // ── 7. Policy and vehicles ──────────────────────────────────────────────────
  const [policy] = await db.insert(policies).values({
    policyNumber: "SCL-2024-00001",
    customerId: customerUser.userId,
    effectiveDate: "2024-01-01",
    expirationDate: "2025-12-31",
  }).onConflictDoNothing().returning();

  const existingPolicy = policy ?? (await db.select().from(policies)
    .where(eq(policies.policyNumber, "SCL-2024-00001")).then(r => r[0]));

  const vehicleSeeds = [
    { vin: "1HGBH41JXMN109186", make: "Honda",  model: "Civic",   year: 2021, value: "22000.00" },
    { vin: "4T1BF3EK2AU068348", make: "Toyota", model: "Camry",   year: 2019, value: "18000.00" },
    { vin: "1FTFW1ET5DFB12345", make: "Ford",   model: "F-150",   year: 2020, value: "13000.00" },
    { vin: "WBA3A5C5XDF357825", make: "BMW",    model: "3 Series", year: 2022, value: "35000.00" },
  ];

  for (const v of vehicleSeeds) {
    await db.insert(vehicles).values({ ...v, policyId: existingPolicy.policyId }).onConflictDoNothing();
  }

  const vehicleList = await db.select().from(vehicles);
  const vehicleByVin = Object.fromEntries(vehicleList.map(v => [v.vin, v]));

  // ── 8. Curated demo photos (Pexels CDN, no upload needed) ──────────────────
  const photoUrls: string[][] = [
    // CLM-001: Honda Civic — minor parking lot scratch/dent
    [33749906, 9956770, 9581527, 10747780].map(px),
    // CLM-002: Toyota Camry — sideswipe, moderate dents
    [24960483, 28443036, 2265634, 29879066].map(px),
    // CLM-003: Ford F-150 — severe frontal collision
    [35784044, 11870919, 11627936, 5351114].map(px),
    // CLM-004: BMW 3 Series — rear-end, fraud-flagged
    [6442699, 1230677, 10747780, 33749906].map(px),
  ];

  // ── 9. Seed claims ──────────────────────────────────────────────────────────

  // Helper: compute line item total
  function lineTotal(partCost: string, laborHours: string, laborRate: string) {
    return (parseFloat(partCost) + parseFloat(laborHours) * parseFloat(laborRate)).toFixed(2);
  }

  // ── Scenario 1: Clean → auto-approve (ready_for_assessment, no assessment yet) ──
  const [claim1] = await db.insert(claims).values({
    claimNumber: "CLM-2024-001",
    vehicleId: vehicleByVin["1HGBH41JXMN109186"].vehicleId,
    reportedByUserId: customerUser.userId,
    assignedAgentId: agentUser.userId,
    statusId: statusMap["ready_for_assessment"],
    incidentDate: "2024-11-15",
    incidentDescription:
      "Minor parking lot incident. A shopping cart struck the driver's side door and front bumper, leaving light scratches and a small dent.",
    fraudFlagged: false,
    updatedBy: customerUser.userId,
  }).onConflictDoNothing().returning();

  const existingClaim1 = claim1 ?? (await db.select().from(claims)
    .where(eq(claims.claimNumber, "CLM-2024-001")).then(r => r[0]));

  const photoTypeNames = ["front", "rear", "left", "right"];
  for (let i = 0; i < 4; i++) {
    await db.insert(claimPhotos).values({
      claimId: existingClaim1.claimId,
      photoTypeId: photoTypeMap[photoTypeNames[i]],
      uploadedByUserId: customerUser.userId,
      storageUrl: photoUrls[0][i],
      qualityCheckPassed: true,
    }).onConflictDoNothing();
  }

  // ── Scenario 2: Ambiguous → agent_review ──────────────────────────────────
  const [claim2] = await db.insert(claims).values({
    claimNumber: "CLM-2024-002",
    vehicleId: vehicleByVin["4T1BF3EK2AU068348"].vehicleId,
    reportedByUserId: customerUser.userId,
    assignedAgentId: agentUser.userId,
    statusId: statusMap["in_review"],
    incidentDate: "2024-11-20",
    incidentDescription:
      "Sideswipe collision on the highway. Multiple panels show moderate dent damage. Some areas are difficult to assess from photos alone.",
    fraudFlagged: false,
    updatedBy: agentUser.userId,
  }).onConflictDoNothing().returning();

  const existingClaim2 = claim2 ?? (await db.select().from(claims)
    .where(eq(claims.claimNumber, "CLM-2024-002")).then(r => r[0]));

  for (let i = 0; i < 4; i++) {
    await db.insert(claimPhotos).values({
      claimId: existingClaim2.claimId,
      photoTypeId: photoTypeMap[photoTypeNames[i]],
      uploadedByUserId: customerUser.userId,
      storageUrl: photoUrls[1][i],
      qualityCheckPassed: true,
    }).onConflictDoNothing();
  }

  // Assessment for claim 2
  const [assessment2] = await db.insert(assessments).values({
    claimId: existingClaim2.claimId,
    version: 1,
    source: "mock",
    modelVersion: "mock-v1",
    overallConfidence: "0.7200",
    summary:
      "Moderate dent damage across the driver-side door, rear quarter panel, and front bumper. Multiple impact points suggest a sideswipe event. Some areas obscured by photo angle — possible hidden damage behind the rear panel not visible from exterior.",
    isCurrent: true,
  }).returning();

  // 4 findings: moderate + repair → 4 × $780 = $3,120
  const findings2 = [
    { partLabel: "Driver-Side Door",         damageType: "dent", severity: "moderate", action: "repair", confidence: "0.7800", note: null },
    { partLabel: "Rear Quarter Panel",        damageType: "dent", severity: "moderate", action: "repair", confidence: "0.6900", note: "Photo angle may obscure full extent of damage." },
    { partLabel: "Front Bumper",              damageType: "dent", severity: "moderate", action: "repair", confidence: "0.7400", note: null },
    { partLabel: "Driver-Side Mirror",        damageType: "scratch", severity: "moderate", action: "repair", confidence: "0.7200", note: null },
  ];

  for (const f of findings2) {
    await db.insert(assessmentFindings).values({
      assessmentId: assessment2.assessmentId,
      damageTypeId: damageTypeMap[f.damageType],
      severityId: severityMap[f.severity],
      repairActionId: repairActionMap[f.action],
      partLabel: f.partLabel,
      confidence: f.confidence,
      uncertaintyNote: f.note,
    });
  }

  // Line items for claim 2
  for (const f of findings2) {
    const { partCost, laborHours } = PRICING[f.severity][f.action];
    await db.insert(estimateLineItems).values({
      assessmentId: assessment2.assessmentId,
      description: `${f.severity} ${f.damageType} — ${f.partLabel} (${f.action})`,
      partCost,
      laborHours,
      laborRate: LABOR_RATE,
    });
  }

  // Routing for claim 2 (total: 4 × 780 = $3,120 → agent_review)
  await db.insert(routingDecisions).values({
    claimId: existingClaim2.claimId,
    assessmentId: assessment2.assessmentId,
    tierId: routingTierMap["agent_review"],
    confidenceSnapshot: "0.7200",
    estimateSnapshot: "3120.00",
    fraudFlagged: false,
    triggeredBy: "confidence_below_threshold",
    decidedAt: new Date(),
  });

  // ── Scenario 3: Severe → senior_adjuster ──────────────────────────────────
  const [claim3] = await db.insert(claims).values({
    claimNumber: "CLM-2024-003",
    vehicleId: vehicleByVin["1FTFW1ET5DFB12345"].vehicleId,
    reportedByUserId: customerUser.userId,
    assignedAgentId: agentUser.userId,
    statusId: statusMap["in_review"],
    incidentDate: "2024-12-01",
    incidentDescription:
      "Frontal collision at an intersection. Severe structural damage to the front end, radiator area, and hood. Airbags deployed. Vehicle may be a total loss.",
    fraudFlagged: false,
    updatedBy: agentUser.userId,
  }).onConflictDoNothing().returning();

  const existingClaim3 = claim3 ?? (await db.select().from(claims)
    .where(eq(claims.claimNumber, "CLM-2024-003")).then(r => r[0]));

  for (let i = 0; i < 4; i++) {
    await db.insert(claimPhotos).values({
      claimId: existingClaim3.claimId,
      photoTypeId: photoTypeMap[photoTypeNames[i]],
      uploadedByUserId: customerUser.userId,
      storageUrl: photoUrls[2][i],
      qualityCheckPassed: true,
    }).onConflictDoNothing();
  }

  const [assessment3] = await db.insert(assessments).values({
    claimId: existingClaim3.claimId,
    version: 1,
    source: "mock",
    modelVersion: "mock-v1",
    overallConfidence: "0.8800",
    summary:
      "Severe frontal impact with structural damage to the engine bay, hood, and front frame rails. Radiator and cooling system destroyed. Estimated repair cost approaches or exceeds the vehicle's market value — possible total loss.",
    isCurrent: true,
  }).returning();

  // 3 findings: severe + replace → 3 × $3,480 = $10,440 (exceeds $10k threshold)
  const findings3 = [
    { partLabel: "Front Frame / Engine Bay",  damageType: "structural", severity: "severe", action: "replace", confidence: "0.9100", note: null },
    { partLabel: "Hood",                      damageType: "structural", severity: "severe", action: "replace", confidence: "0.8900", note: null },
    { partLabel: "Radiator & Cooling System", damageType: "structural", severity: "severe", action: "replace", confidence: "0.8400", note: "Requires inspection to confirm full extent of damage." },
  ];

  for (const f of findings3) {
    await db.insert(assessmentFindings).values({
      assessmentId: assessment3.assessmentId,
      damageTypeId: damageTypeMap[f.damageType],
      severityId: severityMap[f.severity],
      repairActionId: repairActionMap[f.action],
      partLabel: f.partLabel,
      confidence: f.confidence,
      uncertaintyNote: f.note,
    });
  }

  for (const f of findings3) {
    const { partCost, laborHours } = PRICING[f.severity][f.action];
    await db.insert(estimateLineItems).values({
      assessmentId: assessment3.assessmentId,
      description: `${f.severity} ${f.damageType} — ${f.partLabel} (${f.action})`,
      partCost,
      laborHours,
      laborRate: LABOR_RATE,
    });
  }

  // Routing for claim 3 (total $10,440 ≥ $10,000 → senior_adjuster)
  await db.insert(routingDecisions).values({
    claimId: existingClaim3.claimId,
    assessmentId: assessment3.assessmentId,
    tierId: routingTierMap["senior_adjuster"],
    confidenceSnapshot: "0.8800",
    estimateSnapshot: "10440.00",
    fraudFlagged: false,
    triggeredBy: "estimate_exceeds_threshold",
    decidedAt: new Date(),
  });

  // ── Scenario 4: Fraud-flagged → senior_adjuster ────────────────────────────
  const [claim4] = await db.insert(claims).values({
    claimNumber: "CLM-2024-004",
    vehicleId: vehicleByVin["WBA3A5C5XDF357825"].vehicleId,
    reportedByUserId: customerUser.userId,
    assignedAgentId: agentUser.userId,
    statusId: statusMap["in_review"],
    incidentDate: "2024-12-10",
    incidentDescription:
      "Rear-end collision in a parking structure. Damage to the rear bumper and trunk lid.",
    fraudFlagged: true,
    updatedBy: agentUser.userId,
  }).onConflictDoNothing().returning();

  const existingClaim4 = claim4 ?? (await db.select().from(claims)
    .where(eq(claims.claimNumber, "CLM-2024-004")).then(r => r[0]));

  for (let i = 0; i < 4; i++) {
    await db.insert(claimPhotos).values({
      claimId: existingClaim4.claimId,
      photoTypeId: photoTypeMap[photoTypeNames[i]],
      uploadedByUserId: customerUser.userId,
      storageUrl: photoUrls[3][i],
      qualityCheckPassed: true,
    }).onConflictDoNothing();
  }

  const [assessment4] = await db.insert(assessments).values({
    claimId: existingClaim4.claimId,
    version: 1,
    source: "mock",
    modelVersion: "mock-v1",
    overallConfidence: "0.7800",
    summary:
      "Moderate dent damage to rear bumper and trunk lid consistent with a low-speed rear impact. Photo metadata suggests images may have been captured before the reported incident date — flagged for manual review.",
    isCurrent: true,
  }).returning();

  // 3 findings: moderate + repair → 3 × $780 = $2,340
  const findings4 = [
    { partLabel: "Rear Bumper",   damageType: "dent", severity: "moderate", action: "repair", confidence: "0.8100", note: null },
    { partLabel: "Trunk Lid",     damageType: "dent", severity: "moderate", action: "repair", confidence: "0.7600", note: null },
    { partLabel: "Rear Quarter",  damageType: "scratch", severity: "moderate", action: "repair", confidence: "0.7700", note: null },
  ];

  for (const f of findings4) {
    await db.insert(assessmentFindings).values({
      assessmentId: assessment4.assessmentId,
      damageTypeId: damageTypeMap[f.damageType],
      severityId: severityMap[f.severity],
      repairActionId: repairActionMap[f.action],
      partLabel: f.partLabel,
      confidence: f.confidence,
      uncertaintyNote: f.note,
    });
  }

  for (const f of findings4) {
    const { partCost, laborHours } = PRICING[f.severity][f.action];
    await db.insert(estimateLineItems).values({
      assessmentId: assessment4.assessmentId,
      description: `${f.severity} ${f.damageType} — ${f.partLabel} (${f.action})`,
      partCost,
      laborHours,
      laborRate: LABOR_RATE,
    });
  }

  // Routing for claim 4 (fraud_flagged → senior_adjuster)
  await db.insert(routingDecisions).values({
    claimId: existingClaim4.claimId,
    assessmentId: assessment4.assessmentId,
    tierId: routingTierMap["senior_adjuster"],
    confidenceSnapshot: "0.7800",
    estimateSnapshot: "2340.00",
    fraudFlagged: true,
    triggeredBy: "fraud_flag",
    decidedAt: new Date(),
  });

  console.log("✅  Seed complete.");
  console.log("   CLM-2024-001 → ready_for_assessment (clean, demo auto-approve)");
  console.log("   CLM-2024-002 → in_review / agent_review  (ambiguous, $3,120)");
  console.log("   CLM-2024-003 → in_review / senior_adjuster (severe, $10,440)");
  console.log("   CLM-2024-004 → in_review / senior_adjuster (fraud-flagged, $2,340)");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
