import { Schema, model } from "mongoose";

export interface ProductDoc {
  productId: string;
  name: string;
  category: string;
  unitPricePaise: number;
  costPricePaise: number;
  isActive: boolean;
}

const productSchema = new Schema<ProductDoc>(
  {
    productId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    unitPricePaise: { type: Number, required: true, min: 0 },
    costPricePaise: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Product = model<ProductDoc>("Product", productSchema);
