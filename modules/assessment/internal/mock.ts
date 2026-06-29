import type { AssessmentResponse } from "@/shared/schemas";

type Fixture = Omit<AssessmentResponse, "claimId">;

// Deterministic fixtures keyed to seed claim numbers (section 13)
const FIXTURES: Record<string, Fixture> = {
  "CLM-2024-001": {
    source: "mock",
    modelVersion: "mock-v1",
    overallConfidence: 0.95,
    summary:
      "Light contact damage from a parking-lot incident. Two minor scratches on the driver-side door and a small dent on the front bumper — both well within repair range. No structural concerns. High confidence; estimate should fall well under the auto-approve threshold.",
    findings: [
      {
        partLabel: "Driver-Side Door",
        damageType: "scratch",
        severity: "minor",
        repairAction: "repair",
        confidence: 0.96,
        uncertaintyNote: null,
      },
      {
        partLabel: "Front Bumper",
        damageType: "dent",
        severity: "minor",
        repairAction: "repair",
        confidence: 0.94,
        uncertaintyNote: null,
      },
      {
        partLabel: "Door Handle Surround",
        damageType: "scratch",
        severity: "minor",
        repairAction: "repair",
        confidence: 0.95,
        uncertaintyNote: null,
      },
    ],
  },
};

// Default plausible assessment for any live-created claim
const DEFAULT_FIXTURE: Fixture = {
  source: "mock",
  modelVersion: "mock-v1",
  overallConfidence: 0.75,
  summary:
    "Moderate impact damage observed across two panels. Assessment confidence is adequate but below auto-approve threshold — recommended for agent review to confirm findings and finalize estimate.",
  findings: [
    {
      partLabel: "Front Bumper",
      damageType: "dent",
      severity: "moderate",
      repairAction: "repair",
      confidence: 0.78,
      uncertaintyNote: null,
    },
    {
      partLabel: "Hood",
      damageType: "scratch",
      severity: "moderate",
      repairAction: "repair",
      confidence: 0.72,
      uncertaintyNote: "Photo angle may not capture full extent of damage.",
    },
  ],
};

export function getMockFixture(claimNumber: string): Fixture {
  return FIXTURES[claimNumber] ?? DEFAULT_FIXTURE;
}
