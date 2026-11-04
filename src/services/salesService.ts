import { assertDateRange, endOfUtcDay, parseUtcDate } from "../utils/dateUtils.js";
import { AppError } from "../utils/errors.js";
import { salesRepository } from "../repositories/salesRepository.js";
import { productRepository } from "../repositories/productRepository.js";

export const salesService = {
  async getSummary(input: {
    startDate: string;
    endDate: string;
    productId?: string;
    region?: string;
  }) {
    try {
      assertDateRange(input.startDate, input.endDate);
    } catch (e) {
      throw new AppError("INVALID_INPUT", (e as Error).message);
    }

    if (input.productId) {
      const exists = await productRepository.exists(input.productId);
      if (!exists) {
        throw new AppError("NOT_FOUND", `Unknown productId: ${input.productId}`);
      }
    }

    return salesRepository.getSummary({
      start: parseUtcDate(input.startDate),
      end: endOfUtcDay(input.endDate),
      productId: input.productId,
      region: input.region,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  },

  async getTopProducts(input: {
    startDate: string;
    endDate: string;
    metric?: "revenue" | "quantity";
    limit?: number;
  }) {
    try {
      assertDateRange(input.startDate, input.endDate);
    } catch (e) {
      throw new AppError("INVALID_INPUT", (e as Error).message);
    }

    const metric = input.metric ?? "revenue";
    const limit = input.limit ?? 5;
    if (limit < 1 || limit > 50) {
      throw new AppError("INVALID_INPUT", "limit must be between 1 and 50");
    }

    return salesRepository.getTopProducts({
      start: parseUtcDate(input.startDate),
      end: endOfUtcDay(input.endDate),
      metric,
      limit,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  },
};
