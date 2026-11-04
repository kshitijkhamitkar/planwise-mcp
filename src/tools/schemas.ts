import { z } from "zod";

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const getSalesSummarySchema = z.object({
  startDate: dateString.describe("Range start YYYY-MM-DD (UTC, inclusive)"),
  endDate: dateString.describe("Range end YYYY-MM-DD (UTC, inclusive)"),
  productId: z.string().min(1).optional().describe("Optional product filter, e.g. P-001"),
  region: z.string().min(1).optional().describe("Optional customer region filter"),
});

export const getTopProductsSchema = z.object({
  startDate: dateString.describe("Range start YYYY-MM-DD (UTC, inclusive)"),
  endDate: dateString.describe("Range end YYYY-MM-DD (UTC, inclusive)"),
  metric: z
    .enum(["revenue", "quantity"])
    .optional()
    .default("revenue")
    .describe("Rank by revenue or quantity"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(5)
    .describe("How many products to return (1-50)"),
});

export const getInventoryStatusSchema = z.object({
  productId: z.string().min(1).optional().describe("Optional productId filter"),
  warehouseId: z
    .string()
    .min(1)
    .optional()
    .describe("Warehouse id; defaults to WH-MAIN"),
});

export const detectStockoutRiskSchema = z.object({
  horizonDays: z
    .number()
    .int()
    .min(1)
    .max(90)
    .optional()
    .default(14)
    .describe("Look-ahead window in days (1-90)"),
  warehouseId: z.string().min(1).optional().describe("Defaults to WH-MAIN"),
});

export const recommendReplenishmentSchema = z.object({
  productId: z.string().min(1).describe("Product to replenish, e.g. P-014"),
  horizonDays: z
    .number()
    .int()
    .min(1)
    .max(90)
    .optional()
    .default(30)
    .describe("Forecast horizon in days (1-90)"),
  warehouseId: z.string().min(1).optional().describe("Defaults to WH-MAIN"),
});
