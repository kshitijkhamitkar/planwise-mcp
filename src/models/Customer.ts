import { Schema, model } from "mongoose";

export interface CustomerDoc {
  customerId: string;
  name: string;
  email: string;
  region: string;
  customerSegment: string;
}

const customerSchema = new Schema<CustomerDoc>(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    region: { type: String, required: true, index: true },
    customerSegment: { type: String, required: true },
  },
  { timestamps: true },
);

export const Customer = model<CustomerDoc>("Customer", customerSchema);
