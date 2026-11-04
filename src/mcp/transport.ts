import { loadEnv } from "../config/environment.js";

/**
 * MVP: stdio only.
 * Optional later: Streamable HTTP on PORT for remote MCP clients.
 */
export function getTransportMode(): "stdio" | "http" {
  return loadEnv().MCP_TRANSPORT;
}
