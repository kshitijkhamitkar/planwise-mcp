import { Schema, model } from "mongoose";

export interface InventoryDoc {
  productId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  reorderLevel: number;
  safetyStock: number;
  leadTimeDays: number;
}

const inventorySchema = new Schema<InventoryDoc>(
  {
    productId: { type: String, required: true, index: true },
    warehouseId: { type: String, required: true, index: true },
    onHand: { type: Number, required: true, min: 0 },
    reserved: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, required: true, min: 0 },
    safetyStock: { type: Number, required: true, min: 0 },
    leadTimeDays: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

inventorySchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

export const Inventory = model<InventoryDoc>("Inventory", inventorySchema);
