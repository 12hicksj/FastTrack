export const LABOR_RATE = 60;

export interface PriceEntry {
  partCost: number;
  laborHours: number;
}

// Keyed by severity → repair action
export const PRICE_TABLE: Record<string, Record<string, PriceEntry>> = {
  minor: {
    repair:  { partCost: 200,  laborHours: 1.5 },
    replace: { partCost: 400,  laborHours: 2.0 },
  },
  moderate: {
    repair:  { partCost: 600,  laborHours: 3.0 },
    replace: { partCost: 1200, laborHours: 4.0 },
  },
  severe: {
    repair:  { partCost: 1500, laborHours: 6.0 },
    replace: { partCost: 3000, laborHours: 8.0 },
  },
};

export function lookupPrice(severity: string, repairAction: string): PriceEntry {
  return PRICE_TABLE[severity]?.[repairAction] ?? { partCost: 500, laborHours: 2.0 };
}

export function lineTotal(partCost: number, laborHours: number): number {
  return partCost + laborHours * LABOR_RATE;
}

// Total loss when repair estimate is >= 75% of vehicle value
export const TOTAL_LOSS_THRESHOLD = 0.75;
