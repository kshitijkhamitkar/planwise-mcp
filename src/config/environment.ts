import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/planwise"),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
