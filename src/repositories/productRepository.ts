import { Product } from "../models/Product.js";

export const productRepository = {
  async findById(productId: string) {
    return Product.findOne({ productId }).lean();
  },

  async exists(productId: string): Promise<boolean> {
    const count = await Product.countDocuments({ productId });
    return count > 0;
  },

  async findNamesByIds(productIds: string[]) {
    const rows = await Product.find({ productId: { $in: productIds } })
      .select({ productId: 1, name: 1, category: 1, _id: 0 })
      .lean();
    return new Map(rows.map((r) => [r.productId, r]));
  },
};
