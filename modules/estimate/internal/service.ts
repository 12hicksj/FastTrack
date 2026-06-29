import { db } from "@/db";
import { estimateLineItems } from "@/db/schema/estimate";
import { assessmentFindings, severityLevels, repairActions } from "@/db/schema/assessment";
import { vehicles, claims } from "@/db/schema/claims";
import { eq } from "drizzle-orm";
import { lookupPriceWithVehicle, lineTotal, LABOR_RATE, TOTAL_LOSS_THRESHOLD } from "./pricing";
import type { EstimateResult, LineItemRecord } from "./types";

export async function generateEstimate(
  assessmentId: string,
  claimId: string
): Promise<EstimateResult> {
  // Load findings with resolved severity/action names
  const findings = await db
    .select({
      findingId: assessmentFindings.findingId,
      partLabel: assessmentFindings.partLabel,
      severityName: severityLevels.name,
      repairActionName: repairActions.name,
    })
    .from(assessmentFindings)
    .innerJoin(severityLevels, eq(assessmentFindings.severityId, severityLevels.severityId))
    .innerJoin(repairActions, eq(assessmentFindings.repairActionId, repairActions.repairActionId))
    .where(eq(assessmentFindings.assessmentId, assessmentId));

  // Load vehicle info for pricing and total-loss check
  const claimRows = await db
    .select({ value: vehicles.value, make: vehicles.make, year: vehicles.year })
    .from(claims)
    .innerJoin(vehicles, eq(claims.vehicleId, vehicles.vehicleId))
    .where(eq(claims.claimId, claimId))
    .limit(1);

  const vehicleValue = parseFloat(claimRows[0]?.value ?? "0");
  const vehicleMake = claimRows[0]?.make ?? "";
  const vehicleYear = claimRows[0]?.year ?? new Date().getFullYear();

  // Price each finding and persist line items
  let total = 0;
  const lineItems: LineItemRecord[] = [];

  for (const f of findings) {
    const { partCost, laborHours } = lookupPriceWithVehicle(
      f.severityName,
      f.repairActionName,
      vehicleMake,
      vehicleYear
    );
    const total_line = lineTotal(partCost, laborHours);
    total += total_line;

    const [inserted] = await db
      .insert(estimateLineItems)
      .values({
        assessmentId,
        description: `${f.severityName} ${f.repairActionName} — ${f.partLabel}`,
        partCost: partCost.toFixed(2),
        laborHours: laborHours.toFixed(2),
        laborRate: LABOR_RATE.toFixed(2),
      })
      .returning();

    lineItems.push({
      lineItemId: inserted.lineItemId,
      assessmentId,
      description: inserted.description,
      partCost: inserted.partCost,
      laborHours: inserted.laborHours,
      laborRate: inserted.laborRate,
    });
  }

  const possibleTotalLoss =
    vehicleValue > 0 && total / vehicleValue >= TOTAL_LOSS_THRESHOLD;

  return { lineItems, total: total.toFixed(2), possibleTotalLoss };
}

export async function getEstimate(assessmentId: string): Promise<EstimateResult> {
  const rows = await db
    .select()
    .from(estimateLineItems)
    .where(eq(estimateLineItems.assessmentId, assessmentId));

  let total = 0;
  const lineItems: LineItemRecord[] = rows.map((r) => {
    const lt = parseFloat(r.partCost) + parseFloat(r.laborHours) * parseFloat(r.laborRate);
    total += lt;
    return {
      lineItemId: r.lineItemId,
      assessmentId: r.assessmentId,
      description: r.description,
      partCost: r.partCost,
      laborHours: r.laborHours,
      laborRate: r.laborRate,
    };
  });

  return { lineItems, total: total.toFixed(2), possibleTotalLoss: false };
}
