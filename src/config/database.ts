import mongoose from "mongoose";
import { loadEnv } from "./environment.js";

export async function connectDatabase(): Promise<typeof mongoose> {
  const { MONGODB_URI } = loadEnv();
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGODB_URI);
  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
