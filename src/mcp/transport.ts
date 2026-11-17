import { loadEnv } from "../config/environment.js";

export function getTransportMode(): "stdio" | "http" {
  return loadEnv().MCP_TRANSPORT;
}
