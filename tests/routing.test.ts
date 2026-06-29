import { describe, it, expect } from "vitest";
import { determineTier } from "../modules/routing/internal/rules";

const THRESHOLDS = {
  confidenceMinAutoApprove: 0.9,
  costMaxAutoApprove: 2500,
  costMinSupervisor: 10000,
};

describe("determineTier", () => {
  it("routes to auto_approved when confidence >= 0.90 and cost <= $2,500 with no fraud", () => {
    expect(
      determineTier({
        confidence: 0.95,
        estimateTotal: 870,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("auto_approved");
  });

  it("routes to agent_review when confidence is below threshold", () => {
    expect(
      determineTier({
        confidence: 0.72,
        estimateTotal: 1500,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("agent_review");
  });

  it("routes to agent_review when cost exceeds auto-approve limit but is below supervisor threshold", () => {
    expect(
      determineTier({
        confidence: 0.95,
        estimateTotal: 3120,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("agent_review");
  });

  it("routes to senior_adjuster when estimate meets the high-value threshold", () => {
    expect(
      determineTier({
        confidence: 0.88,
        estimateTotal: 10440,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("senior_adjuster");
  });

  it("routes to senior_adjuster when fraud is flagged regardless of cost and confidence", () => {
    expect(
      determineTier({
        confidence: 0.95,
        estimateTotal: 800,
        fraudFlagged: true,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("senior_adjuster");
  });

  it("routes to senior_adjuster when possible total loss is flagged", () => {
    expect(
      determineTier({
        confidence: 0.92,
        estimateTotal: 2000,
        fraudFlagged: false,
        possibleTotalLoss: true,
        thresholds: THRESHOLDS,
      })
    ).toBe("senior_adjuster");
  });

  it("routes to agent_review when confidence is exactly at threshold but cost is too high", () => {
    expect(
      determineTier({
        confidence: 0.9,
        estimateTotal: 2501,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("agent_review");
  });

  it("routes to auto_approved at the exact boundary values", () => {
    expect(
      determineTier({
        confidence: 0.9,
        estimateTotal: 2500,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("auto_approved");
  });

  it("fraud flag overrides an otherwise auto-approvable claim", () => {
    expect(
      determineTier({
        confidence: 0.97,
        estimateTotal: 500,
        fraudFlagged: true,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("senior_adjuster");
  });

  it("senior_adjuster threshold is exclusive at exactly $10,000", () => {
    expect(
      determineTier({
        confidence: 0.5,
        estimateTotal: 10000,
        fraudFlagged: false,
        possibleTotalLoss: false,
        thresholds: THRESHOLDS,
      })
    ).toBe("senior_adjuster");
  });
});
