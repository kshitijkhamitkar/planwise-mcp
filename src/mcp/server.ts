import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { salesService } from "../services/salesService.js";
import { inventoryService } from "../services/inventoryService.js";
import { planningService } from "../services/planningService.js";
import { AppError, fail, ok } from "../utils/errors.js";
import {
  detectStockoutRiskSchema,
  getInventoryStatusSchema,
  getSalesSummarySchema,
  getTopProductsSchema,
  recommendReplenishmentSchema,
} from "../tools/schemas.js";

function toolText(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function handleError(e: unknown) {
  if (e instanceof AppError) return toolText(fail(e.code, e.message));
  if (e instanceof z.ZodError) {
    return toolText(fail("INVALID_INPUT", e.errors.map((x) => x.message).join("; ")));
  }
  return toolText(fail("INTERNAL", (e as Error).message ?? "Unknown error"));
}

/** Raw shape helpers for MCP SDK tool() registration. */
const salesSummaryShape = {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productId: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
};

const topProductsShape = {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metric: z.enum(["revenue", "quantity"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
};

const inventoryStatusShape = {
  productId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
};

const stockoutRiskShape = {
  horizonDays: z.number().int().min(1).max(90).optional(),
  warehouseId: z.string().min(1).optional(),
};

const replenishmentShape = {
  productId: z.string().min(1),
  horizonDays: z.number().int().min(1).max(90).optional(),
  warehouseId: z.string().min(1).optional(),
};

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "planwise-mcp",
    version: "0.1.0",
    description:
      "Read-only sales, inventory, and replenishment tools. Money in paise (INR*100). Dates YYYY-MM-DD UTC.",
  });

  server.tool(
    "get_sales_summary",
    "Calculate total revenue (paise), units sold, and order stats for a date range. Use when the user asks for sales performance over a period.",
    salesSummaryShape,
    async (args) => {
      try {
        const input = getSalesSummarySchema.parse(args);
        return toolText(ok(await salesService.getSummary(input)));
      } catch (e) {
        return handleError(e);
      }
    },
  );

  server.tool(
    "get_top_products",
    "Rank top-selling products by revenue or quantity for a date range. Use when the user asks for best sellers or top products.",
    topProductsShape,
    async (args) => {
      try {
        const input = getTopProductsSchema.parse(args);
        return toolText(ok(await salesService.getTopProducts(input)));
      } catch (e) {
        return handleError(e);
      }
    },
  );

  server.tool(
    "get_inventory_status",
    "Get current on-hand, reserved, available stock and reorder thresholds. Defaults to warehouse WH-MAIN.",
    inventoryStatusShape,
    async (args) => {
      try {
        const input = getInventoryStatusSchema.parse(args);
        return toolText(ok(await inventoryService.getStatus(input)));
      } catch (e) {
        return handleError(e);
      }
    },
  );

  server.tool(
    "detect_stockout_risk",
    "Identify products likely to run out within horizonDays based on recent demand and available stock.",
    stockoutRiskShape,
    async (args) => {
      try {
        const input = detectStockoutRiskSchema.parse(args);
        return toolText(ok(await planningService.detectStockoutRisk(input)));
      } catch (e) {
        return handleError(e);
      }
    },
  );

  server.tool(
    "recommend_replenishment",
    "Recommend how many units to replenish for a product using weighted moving-average demand + safety stock.",
    replenishmentShape,
    async (args) => {
      try {
        const input = recommendReplenishmentSchema.parse(args);
        return toolText(ok(await planningService.recommendReplenishment(input)));
      } catch (e) {
        return handleError(e);
      }
    },
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[planwise-mcp] MCP server connected on stdio");
}
