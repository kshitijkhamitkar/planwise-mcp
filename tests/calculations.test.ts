import { describe, expect, it } from "vitest";
import {
  classifyStockoutRisk,
  daysOfCover,
  recommendedReplenishmentQty,
  weightedMovingAverageDaily,
} from "../src/utils/calculations.js";

describe("planning math", () => {
  it("computes replenishment qty", () => {
    expect(
      recommendedReplenishmentQty({
        forecastDemand: 96,
        safetyStock: 20,
        available: 18,
      }),
    ).toBe(98);
  });

  it("classifies high risk when cover < lead time", () => {
    expect(classifyStockoutRisk(5, 7, 14)).toBe("high");
  });

  it("returns null when not at risk", () => {
    expect(classifyStockoutRisk(40, 7, 14)).toBeNull();
  });

  it("handles empty demand series", () => {
    expect(weightedMovingAverageDaily([])).toBe(0);
    expect(daysOfCover(10, 0)).toBeGreaterThan(0);
  });
});
