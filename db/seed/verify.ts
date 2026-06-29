import * as dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  claims,
  claimStatuses,
  routingDecisions,
  routingTiers,
  claimPhotos,
  assessments,
} from "../schema/index";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const result = await db
    .select({ claimNumber: claims.claimNumber, status: claimStatuses.name, fraud: claims.fraudFlagged })
    .from(claims)
    .innerJoin(claimStatuses, eq(claims.statusId, claimStatuses.statusId))
    .orderBy(claims.claimNumber);

  console.log("Claims in DB:");
  result.forEach(r => console.log(" ", r.claimNumber, "->", r.status, r.fraud ? "[FRAUD]" : ""));

  const routing = await db
    .select({ claimNumber: claims.claimNumber, tier: routingTiers.name, estimate: routingDecisions.estimateSnapshot })
    .from(routingDecisions)
    .innerJoin(claims, eq(routingDecisions.claimId, claims.claimId))
    .innerJoin(routingTiers, eq(routingDecisions.tierId, routingTiers.tierId))
    .orderBy(claims.claimNumber);

  console.log("\nRouting decisions:");
  routing.forEach(r => console.log(" ", r.claimNumber, "->", r.tier, "($" + r.estimate + ")"));

  const photos = await db.select().from(claimPhotos);
  console.log("\nPhotos in DB:", photos.length);
  if (photos[0]) console.log("Sample URL:", photos[0].storageUrl.substring(0, 70) + "...");

  const assmts = await db.select().from(assessments);
  console.log("Assessments in DB:", assmts.length);
}

main().catch(console.error);
