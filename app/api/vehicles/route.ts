import { getSession, requireRole, handleApiError } from "@/auth";
import { listVehiclesForUser } from "@/modules/claims/interface";
import { db } from "@/db";
import { vehicles } from "@/db/schema/claims";
import { policies } from "@/db/schema/claims";
import { eq } from "drizzle-orm";

// Returns vehicles available for claim intake.
// Agents and supervisors see all vehicles; customers see only their own.
export async function GET() {
  try {
    const user = await getSession();
    requireRole(user, "customer");

    if (user.role === "customer") {
      const rows = await listVehiclesForUser(user.userId);
      return Response.json(rows);
    }

    // Agent/supervisor: return all vehicles (for creating claims on behalf of customers)
    const rows = await db
      .select({
        vehicleId: vehicles.vehicleId,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        vin: vehicles.vin,
        value: vehicles.value,
        customerId: policies.customerId,
      })
      .from(vehicles)
      .innerJoin(policies, eq(vehicles.policyId, policies.policyId));

    return Response.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
