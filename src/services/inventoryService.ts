import { AppError } from "../utils/errors.js";
import { inventoryRepository } from "../repositories/inventoryRepository.js";
import { productRepository } from "../repositories/productRepository.js";
import { availableStock } from "../utils/calculations.js";

const DEFAULT_WAREHOUSE = "WH-MAIN";

export const inventoryService = {
  async getStatus(input: { productId?: string; warehouseId?: string }) {
    const warehouseId = input.warehouseId ?? DEFAULT_WAREHOUSE;

    if (input.productId) {
      const exists = await productRepository.exists(input.productId);
      if (!exists) {
        throw new AppError("NOT_FOUND", `Unknown productId: ${input.productId}`);
      }
    }

    const items = await inventoryRepository.getStatus({
      productId: input.productId,
      warehouseId,
    });

    if (input.productId && items.length === 0) {
      throw new AppError(
        "NOT_FOUND",
        `No inventory for productId=${input.productId} warehouseId=${warehouseId}`,
      );
    }

    return { warehouseId, items };
  },

  availableStock,
};
