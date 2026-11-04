import { Sale } from "../models/Sale.js";
import { Customer } from "../models/Customer.js";
import { productRepository } from "./productRepository.js";

function completedMatch(start: Date, end: Date, productId?: string) {
  const match: Record<string, unknown> = {
    status: "completed",
    saleDate: { $gte: start, $lte: end },
  };
  if (productId) match.productId = productId;
  return match;
}

export const salesRepository = {
  async getSummary(params: {
    start: Date;
    end: Date;
    productId?: string;
    region?: string;
    startDate: string;
    endDate: string;
  }) {
    const match = completedMatch(params.start, params.end, params.productId);

    if (params.region) {
      const customers = await Customer.find({ region: params.region })
        .select({ customerId: 1, _id: 0 })
        .lean();
      match.customerId = { $in: customers.map((c) => c.customerId) };
    }

    const [agg] = await Sale.aggregate<{
      totalRevenuePaise: number;
      totalUnits: number;
      orderIds: string[];
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenuePaise: { $sum: "$totalAmountPaise" },
          totalUnits: { $sum: "$quantity" },
          orderIds: { $addToSet: "$orderId" },
        },
      },
    ]);

    const totalRevenuePaise = agg?.totalRevenuePaise ?? 0;
    const totalUnits = agg?.totalUnits ?? 0;
    const orderCount = agg?.orderIds?.length ?? 0;

    return {
      startDate: params.startDate,
      endDate: params.endDate,
      filters: {
        productId: params.productId ?? null,
        region: params.region ?? null,
      },
      totalRevenuePaise,
      totalUnits,
      orderCount,
      avgOrderValuePaise: orderCount === 0 ? 0 : Math.round(totalRevenuePaise / orderCount),
    };
  },

  async getTopProducts(params: {
    start: Date;
    end: Date;
    metric: "revenue" | "quantity";
    limit: number;
    startDate: string;
    endDate: string;
  }) {
    const sortField =
      params.metric === "revenue" ? "revenuePaise" : "unitsSold";

    const rows = await Sale.aggregate<{
      _id: string;
      revenuePaise: number;
      unitsSold: number;
    }>([
      { $match: completedMatch(params.start, params.end) },
      {
        $group: {
          _id: "$productId",
          revenuePaise: { $sum: "$totalAmountPaise" },
          unitsSold: { $sum: "$quantity" },
        },
      },
      { $sort: { [sortField]: -1 } },
      { $limit: params.limit },
    ]);

    const names = await productRepository.findNamesByIds(rows.map((r) => r._id));

    return {
      startDate: params.startDate,
      endDate: params.endDate,
      metric: params.metric,
      limit: params.limit,
      products: rows.map((r, i) => {
        const meta = names.get(r._id);
        return {
          rank: i + 1,
          productId: r._id,
          name: meta?.name ?? r._id,
          category: meta?.category ?? "Unknown",
          revenuePaise: r.revenuePaise,
          unitsSold: r.unitsSold,
        };
      }),
    };
  },

  /**
   * Daily completed units for a product.
   * Returns oldest → newest array, one entry per calendar day in [start, end].
   */
  async getDailyDemand(params: {
    productId: string;
    start: Date;
    end: Date;
  }): Promise<number[]> {
    const rows = await Sale.aggregate<{ _id: string; units: number }>([
      {
        $match: {
          ...completedMatch(params.start, params.end, params.productId),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$saleDate", timezone: "UTC" },
          },
          units: { $sum: "$quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byDay = new Map(rows.map((r) => [r._id, r.units]));
    const days: number[] = [];
    const cursor = new Date(params.start);
    // Normalize to UTC midnight
    cursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(params.end);
    endDay.setUTCHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      days.push(byDay.get(key) ?? 0);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  },
};
