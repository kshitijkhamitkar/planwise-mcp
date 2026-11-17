import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { loadEnv } from "../config/environment.js";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function extractApiKey(req: Request): string | undefined {
  const headerKey = req.header("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.header("authorization");
  if (!auth) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match?.[1]?.trim();
}

/** Protect /mcp in HTTP mode. */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const { API_KEY, ALLOW_INSECURE_HTTP } = loadEnv();

  if (!API_KEY) {
    if (ALLOW_INSECURE_HTTP) {
      next();
      return;
    }
    res.status(500).json({
      error: "Server misconfigured: API_KEY is required for HTTP mode",
    });
    return;
  }

  const provided = extractApiKey(req);
  if (!provided || !safeEqual(provided, API_KEY)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
