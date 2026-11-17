import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/planwise"),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(3000),
  /** Bind address for HTTP mode. Use 0.0.0.0 on hosted platforms. */
  HOST: z.string().default("0.0.0.0"),
  /**
   * Required for HTTP mode unless ALLOW_INSECURE_HTTP=true.
   * Clients send: Authorization: Bearer <API_KEY>  or  X-API-Key: <API_KEY>
   */
  API_KEY: z.string().optional().default(""),
  /** Local HTTP testing only. Never enable on a public deployment. */
  ALLOW_INSECURE_HTTP: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
