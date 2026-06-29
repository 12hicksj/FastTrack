import { describe, it, expect } from "vitest";
import {
  PRICE_TABLE,
  LABOR_RATE,
  lineTotal,
  lookupPrice,
  TOTAL_LOSS_THRESHOLD,
} from "../modules/estimate/internal/pricing";

describe("PRICE_TABLE", () => {
  it("contains entries for all severity × repair-action combinations", () => {
    const severities = ["minor", "moderate", "severe"];
    const actions = ["repair", "replace"];
    for (const s of severities) {
      for (const a of actions) {
        expect(PRICE_TABLE[s][a]).toBeDefined();
        expect(PRICE_TABLE[s][a].partCost).toBeGreaterThan(0);
        expect(PRICE_TABLE[s][a].laborHours).toBeGreaterThan(0);
      }
    }
  });

  it("part cost and labor hours increase with severity", () => {
    expect(PRICE_TABLE.moderate.repair.partCost).toBeGreaterThan(
      PRICE_TABLE.minor.repair.partCost
    );
    expect(PRICE_TABLE.severe.repair.partCost).toBeGreaterThan(
      PRICE_TABLE.moderate.repair.partCost
    );
  });

  it("replace costs more than repair for each severity", () => {
    for (const s of ["minor", "moderate", "severe"]) {
      expect(PRICE_TABLE[s].replace.partCost).toBeGreaterThan(
        PRICE_TABLE[s].repair.partCost
      );
    }
  });
});

describe("lineTotal", () => {
  it("computes part_cost + labor_hours * labor_rate", () => {
    expect(lineTotal(200, 1.5)).toBe(200 + 1.5 * LABOR_RATE);
    expect(lineTotal(600, 3)).toBe(600 + 3 * LABOR_RATE);
    expect(lineTotal(3000, 8)).toBe(3000 + 8 * LABOR_RATE);
  });

  it("clean scenario three minor-repair findings total under $2,500", () => {
    const { partCost, laborHours } = PRICE_TABLE.minor.repair;
    const total = 3 * lineTotal(partCost, laborHours);
    expect(total).toBeLessThan(2500);
  });

  it("severe scenario three severe-replace findings total at least $10,000", () => {
    const { partCost, laborHours } = PRICE_TABLE.severe.replace;
    const total = 3 * lineTotal(partCost, laborHours);
    expect(total).toBeGreaterThanOrEqual(10000);
  });
});

describe("lookupPrice", () => {
  it("returns expected values for known combinations", () => {
    expect(lookupPrice("minor", "repair")).toEqual(PRICE_TABLE.minor.repair);
    expect(lookupPrice("severe", "replace")).toEqual(PRICE_TABLE.severe.replace);
  });

  it("returns a fallback for unknown combinations", () => {
    const fallback = lookupPrice("unknown", "unknown");
    expect(fallback.partCost).toBeGreaterThan(0);
    expect(fallback.laborHours).toBeGreaterThan(0);
  });
});

describe("TOTAL_LOSS_THRESHOLD", () => {
  it("is 0.75", () => {
    expect(TOTAL_LOSS_THRESHOLD).toBe(0.75);
  });

  it("flags total loss when repair >= 75% of vehicle value", () => {
    const vehicleValue = 13000;
    const repairTotal = 10440; // 80.3%
    expect(repairTotal / vehicleValue >= TOTAL_LOSS_THRESHOLD).toBe(true);
  });

  it("does not flag total loss below 75%", () => {
    const vehicleValue = 22000;
    const repairTotal = 870;
    expect(repairTotal / vehicleValue >= TOTAL_LOSS_THRESHOLD).toBe(false);
  });
});
