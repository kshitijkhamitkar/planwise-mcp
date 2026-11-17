import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/planwise"),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(3000),
  /** Bind address for HTTP mode. Use 0.0.0.0 on hosted platforms. */
  HOST: z.string().default("0.0.0.0"),
  /**
   * Auth for HTTP /mcp:
   * - none  → ChatGPT "No authentication" (open endpoint; OK for demo data)
   * - api_key → require Authorization: Bearer or X-API-Key
   */
  MCP_AUTH_MODE: z.enum(["none", "api_key"]).default("api_key"),
  /**
   * Required when MCP_AUTH_MODE=api_key.
   * Clients send: Authorization: Bearer <API_KEY>  or  X-API-Key: <API_KEY>
   */
  API_KEY: z.string().optional().default(""),
  /** @deprecated Prefer MCP_AUTH_MODE=none. Kept for older deploys. */
  ALLOW_INSECURE_HTTP: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const env = envSchema.parse(process.env);
  // Back-compat: ALLOW_INSECURE_HTTP=true behaves like MCP_AUTH_MODE=none
  if (env.ALLOW_INSECURE_HTTP && env.MCP_AUTH_MODE === "api_key") {
    return { ...env, MCP_AUTH_MODE: "none" };
  }
  return env;
}
