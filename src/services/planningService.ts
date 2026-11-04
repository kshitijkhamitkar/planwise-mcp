import { AppError } from "../utils/errors.js";
import {
  classifyStockoutRisk,
  daysOfCover,
  recommendedReplenishmentQty,
  weightedMovingAverageDaily,
} from "../utils/calculations.js";
import { salesRepository } from "../repositories/salesRepository.js";
import { inventoryRepository } from "../repositories/inventoryRepository.js";
import { productRepository } from "../repositories/productRepository.js";
import { availableStock } from "../utils/calculations.js";

const DEFAULT_WAREHOUSE = "WH-MAIN";
const LOOKBACK_DAYS = 28;

function utcDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function utcTodayEnd(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

async function avgDailyDemand(productId: string): Promise<number> {
  const oldestFirst = await salesRepository.getDailyDemand({
    productId,
    start: utcDaysAgo(LOOKBACK_DAYS - 1),
    end: utcTodayEnd(),
  });
  // WMA expects newest-first weekly buckets
  const newestFirst = [...oldestFirst].reverse();
  return weightedMovingAverageDaily(newestFirst);
}

export const planningService = {
  async detectStockoutRisk(input: { horizonDays?: number; warehouseId?: string }) {
    const horizonDays = input.horizonDays ?? 14;
    if (horizonDays < 1 || horizonDays > 90) {
      throw new AppError("INVALID_INPUT", "horizonDays must be between 1 and 90");
    }
    const warehouseId = input.warehouseId ?? DEFAULT_WAREHOUSE;

    const rows = await inventoryRepository.listByWarehouse(warehouseId);
    const names = await productRepository.findNamesByIds(rows.map((r) => r.productId));

    const atRisk: Array<{
      productId: string;
      name: string;
      available: number;
      avgDailyDemand: number;
      daysOfCover: number;
      reorderLevel: number;
      leadTimeDays: number;
      riskLevel: "high" | "medium";
    }> = [];

    for (const row of rows) {
      const available = availableStock(row.onHand, row.reserved);
      const avg = await avgDailyDemand(row.productId);
      const cover = daysOfCover(available, avg);
      const risk = classifyStockoutRisk(cover, row.leadTimeDays, horizonDays);
      if (!risk) continue;

      atRisk.push({
        productId: row.productId,
        name: names.get(row.productId)?.name ?? row.productId,
        available,
        avgDailyDemand: Number(avg.toFixed(2)),
        daysOfCover: Number(cover.toFixed(1)),
        reorderLevel: row.reorderLevel,
        leadTimeDays: row.leadTimeDays,
        riskLevel: risk,
      });
    }

    atRisk.sort((a, b) => a.daysOfCover - b.daysOfCover);

    return { horizonDays, warehouseId, atRisk };
  },

  async recommendReplenishment(input: {
    productId: string;
    horizonDays?: number;
    warehouseId?: string;
  }) {
    const horizonDays = input.horizonDays ?? 30;
    if (horizonDays < 1 || horizonDays > 90) {
      throw new AppError("INVALID_INPUT", "horizonDays must be between 1 and 90");
    }
    const warehouseId = input.warehouseId ?? DEFAULT_WAREHOUSE;

    const product = await productRepository.findById(input.productId);
    if (!product) {
      throw new AppError("NOT_FOUND", `Unknown productId: ${input.productId}`);
    }

    const inv = await inventoryRepository.getByProduct(input.productId, warehouseId);
    if (!inv) {
      throw new AppError(
        "NOT_FOUND",
        `No inventory for productId=${input.productId} warehouseId=${warehouseId}`,
      );
    }

    const avg = await avgDailyDemand(input.productId);
    const available = availableStock(inv.onHand, inv.reserved);
    const forecastDemand = Math.ceil(avg * horizonDays);
    const recommendedQty = recommendedReplenishmentQty({
      forecastDemand,
      safetyStock: inv.safetyStock,
      available,
    });

    return {
      productId: input.productId,
      name: product.name,
      warehouseId,
      horizonDays,
      onHand: inv.onHand,
      reserved: inv.reserved,
      available,
      safetyStock: inv.safetyStock,
      leadTimeDays: inv.leadTimeDays,
      avgDailyDemand: Number(avg.toFixed(2)),
      forecastDemand,
      recommendedQty,
      rationale: `Forecast ${forecastDemand} units over ${horizonDays} days + safety stock ${inv.safetyStock} − available ${available}.`,
    };
  },
};

export const planningMath = {
  classifyStockoutRisk,
  daysOfCover,
  recommendedReplenishmentQty,
  weightedMovingAverageDaily,
};
