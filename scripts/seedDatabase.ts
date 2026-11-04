/**
 * Seed synthetic PlanWise data with seasonality + product trends.
 * Targets: 100 customers, 30 products, ~5000 sale lines / 12 months,
 * 30 inventory rows (WH-MAIN), ~500 movements.
 */
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Product } from "../src/models/Product.js";
import { Customer } from "../src/models/Customer.js";
import { Sale } from "../src/models/Sale.js";
import { Inventory } from "../src/models/Inventory.js";
import { InventoryMovement } from "../src/models/InventoryMovement.js";

const REGIONS = ["North", "South", "East", "West", "Central"];
const SEGMENTS = ["Retail", "Wholesale", "Online", "Enterprise"];
const CATEGORIES = ["Drinkware", "Apparel", "Electronics", "Home", "Accessories"];
const WAREHOUSE = "WH-MAIN";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

async function clearAll() {
  await Promise.all([
    Sale.deleteMany({}),
    InventoryMovement.deleteMany({}),
    Inventory.deleteMany({}),
    Customer.deleteMany({}),
    Product.deleteMany({}),
  ]);
}

function buildProducts() {
  const products = [];
  for (let i = 1; i <= 30; i++) {
    const unitPricePaise = 50000 + Math.floor(rand() * 450000); // ₹500–₹5000
    products.push({
      productId: `P-${pad(i, 3)}`,
      name: `${pick(CATEGORIES)} Item ${i}`,
      category: pick(CATEGORIES),
      unitPricePaise,
      costPricePaise: Math.floor(unitPricePaise * 0.55),
      isActive: true,
    });
  }
  return products;
}

function buildCustomers() {
  const customers = [];
  for (let i = 1; i <= 100; i++) {
    customers.push({
      customerId: `C-${pad(i, 3)}`,
      name: `Customer ${i}`,
      email: `customer${i}@example.com`,
      region: pick(REGIONS),
      customerSegment: pick(SEGMENTS),
    });
  }
  return customers;
}

function buildSales(
  products: ReturnType<typeof buildProducts>,
  customers: ReturnType<typeof buildCustomers>,
) {
  // ~12 months ending "today"
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);

  // Give some products rising / falling demand multipliers
  const trendByProduct = new Map<string, number>();
  for (const p of products) {
    trendByProduct.set(p.productId, 0.7 + rand() * 0.8); // baseline intensity
  }
  // Force a few rising SKUs for demo stockout stories
  for (const id of ["P-014", "P-007", "P-021"]) {
    trendByProduct.set(id, 1.6);
  }

  const sales = [];
  let saleSeq = 1;
  let orderSeq = 1;

  for (let day = 0; day < 365; day++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + day);

    const month = date.getUTCMonth(); // 0-11
    const seasonal = 1 + 0.25 * Math.sin(((month - 2) / 12) * Math.PI * 2); // mild seasonality
    const growth = 1 + (day / 365) * 0.15; // slight overall growth
    const ordersToday = Math.max(1, Math.round(8 * seasonal * growth + rand() * 4));

    for (let o = 0; o < ordersToday; o++) {
      const orderId = `O-${pad(orderSeq++, 5)}`;
      const customer = pick(customers);
      const lines = 1 + Math.floor(rand() * 3);

      for (let L = 0; L < lines; L++) {
        const product = pick(products);
        const intensity = trendByProduct.get(product.productId) ?? 1;
        // Rising products sell more in later months
        const lateBoost = 1 + (day / 365) * (intensity > 1.3 ? 1.2 : 0.2);
        const quantity = Math.max(1, Math.round((1 + rand() * 3) * intensity * lateBoost));

        sales.push({
          saleId: `S-${pad(saleSeq++, 6)}`,
          orderId,
          productId: product.productId,
          customerId: customer.customerId,
          quantity,
          totalAmountPaise: quantity * product.unitPricePaise,
          saleDate: new Date(date.getTime() + Math.floor(rand() * 86400000)),
          status: rand() < 0.97 ? "completed" : pick(["returned", "cancelled"] as const),
        });
      }
    }
  }

  return sales;
}

function buildInventory(products: ReturnType<typeof buildProducts>) {
  return products.map((p) => {
    // Put a few SKUs into risky stock levels for demos
    const risky = ["P-014", "P-007", "P-021"].includes(p.productId);
    const onHand = risky ? 20 + Math.floor(rand() * 25) : 80 + Math.floor(rand() * 200);
    const reserved = Math.floor(rand() * Math.min(15, onHand));
    return {
      productId: p.productId,
      warehouseId: WAREHOUSE,
      onHand,
      reserved,
      reorderLevel: risky ? 40 : 30 + Math.floor(rand() * 40),
      safetyStock: risky ? 20 : 10 + Math.floor(rand() * 20),
      leadTimeDays: 5 + Math.floor(rand() * 10),
    };
  });
}

function buildMovements(inventory: ReturnType<typeof buildInventory>) {
  const movements = [];
  let seq = 1;
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 500; i++) {
    const inv = pick(inventory);
    const daysAgo = Math.floor(rand() * 180);
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - daysAgo);
    const movementType = pick(["in", "out", "adjust"] as const);
    movements.push({
      movementId: `M-${pad(seq++, 5)}`,
      productId: inv.productId,
      warehouseId: WAREHOUSE,
      movementType,
      quantity:
        movementType === "adjust"
          ? Math.floor(rand() * 21) - 10
          : 1 + Math.floor(rand() * 40),
      movementDate: date,
    });
  }
  return movements;
}

async function seed() {
  await connectDatabase();
  console.log("Connected to MongoDB. Clearing collections…");
  await clearAll();

  const products = buildProducts();
  const customers = buildCustomers();
  console.log("Inserting products & customers…");
  await Product.insertMany(products);
  await Customer.insertMany(customers);

  console.log("Generating sales (this may take a few seconds)…");
  const sales = buildSales(products, customers);
  // Insert in chunks
  const chunk = 1000;
  for (let i = 0; i < sales.length; i += chunk) {
    await Sale.insertMany(sales.slice(i, i + chunk));
  }

  const inventory = buildInventory(products);
  await Inventory.insertMany(inventory);

  const movements = buildMovements(inventory);
  await InventoryMovement.insertMany(movements);

  console.log("Seed complete:");
  console.log(`  products: ${products.length}`);
  console.log(`  customers: ${customers.length}`);
  console.log(`  sales: ${sales.length}`);
  console.log(`  inventory: ${inventory.length}`);
  console.log(`  movements: ${movements.length}`);

  await disconnectDatabase();
}

seed().catch(async (err) => {
  console.error(err);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
