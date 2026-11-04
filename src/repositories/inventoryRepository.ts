import { Inventory } from "../models/Inventory.js";
import { Product } from "../models/Product.js";

export type InventoryStatusItem = {
  productId: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  safetyStock: number;
  leadTimeDays: number;
  belowReorderLevel: boolean;
};

export const inventoryRepository = {
  async getStatus(params: {
    productId?: string;
    warehouseId: string;
  }): Promise<InventoryStatusItem[]> {
    const filter: Record<string, string> = { warehouseId: params.warehouseId };
    if (params.productId) filter.productId = params.productId;

    const rows = await Inventory.find(filter).lean();
    if (rows.length === 0) return [];

    const products = await Product.find({
      productId: { $in: rows.map((r) => r.productId) },
    })
      .select({ productId: 1, name: 1, _id: 0 })
      .lean();
    const nameById = new Map(products.map((p) => [p.productId, p.name]));

    return rows.map((r) => {
      const available = Math.max(0, r.onHand - r.reserved);
      return {
        productId: r.productId,
        name: nameById.get(r.productId) ?? r.productId,
        onHand: r.onHand,
        reserved: r.reserved,
        available,
        reorderLevel: r.reorderLevel,
        safetyStock: r.safetyStock,
        leadTimeDays: r.leadTimeDays,
        belowReorderLevel: available < r.reorderLevel,
      };
    });
  },

  async getByProduct(productId: string, warehouseId: string) {
    return Inventory.findOne({ productId, warehouseId }).lean();
  },

  async listByWarehouse(warehouseId: string) {
    return Inventory.find({ warehouseId }).lean();
  },
};
