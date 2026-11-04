import { Schema, model } from "mongoose";

export interface InventoryMovementDoc {
  movementId: string;
  productId: string;
  warehouseId: string;
  movementType: "in" | "out" | "adjust";
  quantity: number;
  movementDate: Date;
}

const inventoryMovementSchema = new Schema<InventoryMovementDoc>(
  {
    movementId: { type: String, required: true, unique: true },
    productId: { type: String, required: true, index: true },
    warehouseId: { type: String, required: true, index: true },
    movementType: { type: String, enum: ["in", "out", "adjust"], required: true },
    quantity: { type: Number, required: true },
    movementDate: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

export const InventoryMovement = model<InventoryMovementDoc>(
  "InventoryMovement",
  inventoryMovementSchema,
);
