export const LABOR_RATE = 60;

export interface PriceEntry {
  partCost: number;
  laborHours: number;
}

// Base prices keyed by severity → repair action
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

// Parts cost multiplier by vehicle make (luxury/import parts cost more)
const MAKE_MULTIPLIERS: Record<string, number> = {
  BMW:        2.2,
  Mercedes:   2.1,
  Audi:       2.0,
  Lexus:      1.8,
  Porsche:    2.5,
  Cadillac:   1.6,
  Acura:      1.4,
  Infiniti:   1.4,
  Volvo:      1.5,
  Land:       1.7,  // Land Rover
  Tesla:      1.9,
  Jeep:       1.1,
  Ford:       1.1,
  Chevrolet:  1.05,
  Dodge:      1.05,
  Ram:        1.1,
  GMC:        1.05,
  Toyota:     1.0,
  Honda:      0.95,
  Nissan:     0.95,
  Hyundai:    0.9,
  Kia:        0.9,
  Subaru:     1.0,
  Mazda:      0.95,
  Volkswagen: 1.2,
};

// Parts cost multiplier by model year (newer = harder-to-source, pricier OEM parts)
function yearMultiplier(year: number): number {
  const age = new Date().getFullYear() - year;
  if (age <= 2)  return 1.30;
  if (age <= 5)  return 1.15;
  if (age <= 8)  return 1.00;
  if (age <= 12) return 0.90;
  return 0.80;
}

function makeMult(make: string): number {
  // Match on the first word to handle "Land Rover", "Mercedes-Benz", etc.
  const key = make.split(/[\s-]/)[0];
  return MAKE_MULTIPLIERS[key] ?? 1.0;
}

export function lookupPrice(severity: string, repairAction: string): PriceEntry {
  return PRICE_TABLE[severity]?.[repairAction] ?? { partCost: 500, laborHours: 2.0 };
}

export function lookupPriceWithVehicle(
  severity: string,
  repairAction: string,
  make: string,
  year: number
): PriceEntry {
  const base = lookupPrice(severity, repairAction);
  const mult = makeMult(make) * yearMultiplier(year);
  return {
    partCost: Math.round(base.partCost * mult),
    laborHours: base.laborHours,
  };
}

export function lineTotal(partCost: number, laborHours: number): number {
  return partCost + laborHours * LABOR_RATE;
}

// Total loss when repair estimate is >= 75% of vehicle value
export const TOTAL_LOSS_THRESHOLD = 0.75;
