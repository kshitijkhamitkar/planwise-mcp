/**
 * Call all 5 tools without MCP (direct service smoke test).
 */
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { salesService } from "../src/services/salesService.js";
import { inventoryService } from "../src/services/inventoryService.js";
import { planningService } from "../src/services/planningService.js";

function monthRange(monthsAgo: number) {
  const end = new Date();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() - monthsAgo);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(last) };
}

async function main() {
  await connectDatabase();
  const { startDate, endDate } = monthRange(1);
  console.log("Using range", startDate, endDate);

  console.log("\n1) get_sales_summary");
  console.log(JSON.stringify(await salesService.getSummary({ startDate, endDate }), null, 2));

  console.log("\n2) get_top_products");
  console.log(
    JSON.stringify(
      await salesService.getTopProducts({ startDate, endDate, limit: 5 }),
      null,
      2,
    ),
  );

  console.log("\n3) get_inventory_status (sample)");
  const inv = await inventoryService.getStatus({});
  console.log(JSON.stringify({ ...inv, items: inv.items.slice(0, 3) }, null, 2));

  console.log("\n4) detect_stockout_risk");
  console.log(JSON.stringify(await planningService.detectStockoutRisk({ horizonDays: 14 }), null, 2));

  console.log("\n5) recommend_replenishment P-014");
  console.log(
    JSON.stringify(
      await planningService.recommendReplenishment({ productId: "P-014", horizonDays: 30 }),
      null,
      2,
    ),
  );

  await disconnectDatabase();
}

main().catch(async (e) => {
  console.error(e);
  await disconnectDatabase();
  process.exit(1);
});
