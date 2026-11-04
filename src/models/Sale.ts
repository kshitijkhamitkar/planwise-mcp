import { Schema, model } from "mongoose";

export interface SaleDoc {
  saleId: string;
  orderId: string;
  productId: string;
  customerId: string;
  quantity: number;
  totalAmountPaise: number;
  saleDate: Date;
  status: "completed" | "returned" | "cancelled";
}

const saleSchema = new Schema<SaleDoc>(
  {
    saleId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    totalAmountPaise: { type: Number, required: true, min: 0 },
    saleDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["completed", "returned", "cancelled"],
      default: "completed",
      index: true,
    },
  },
  { timestamps: true },
);

saleSchema.index({ saleDate: 1, productId: 1 });
saleSchema.index({ saleDate: 1, status: 1 });

export const Sale = model<SaleDoc>("Sale", saleSchema);
