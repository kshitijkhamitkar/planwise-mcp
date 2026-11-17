import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { loadEnv } from "../config/environment.js";
import { createMcpServer } from "./server.js";
import { requireApiKey } from "./auth.js";

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  // Stateless Streamable HTTP: new server + transport per request.
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[planwise-mcp] HTTP MCP handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
}

export async function startHttpServer(): Promise<void> {
  const { PORT, HOST, API_KEY, ALLOW_INSECURE_HTTP } = loadEnv();

  if (!API_KEY && !ALLOW_INSECURE_HTTP) {
    throw new Error(
      "HTTP mode requires API_KEY (or set ALLOW_INSECURE_HTTP=true for local testing only).",
    );
  }

  if (!API_KEY && ALLOW_INSECURE_HTTP) {
    console.error(
      "[planwise-mcp] WARNING: ALLOW_INSECURE_HTTP=true — /mcp has no auth. Do not use this publicly.",
    );
  }

  const app = createMcpExpressApp({ host: HOST });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "planwise-mcp",
      transport: "http",
      mcpPath: "/mcp",
    });
  });

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "planwise-mcp",
      version: "0.1.0",
      mcp: "/mcp",
      health: "/health",
      auth: "Authorization: Bearer <API_KEY> or X-API-Key: <API_KEY>",
    });
  });

  app.post("/mcp", requireApiKey, (req, res) => {
    void handleMcpRequest(req, res);
  });

  // Some Streamable HTTP clients also use GET/DELETE on the MCP endpoint.
  app.get("/mcp", requireApiKey, (req, res) => {
    void handleMcpRequest(req, res);
  });
  app.delete("/mcp", requireApiKey, (req, res) => {
    void handleMcpRequest(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.error(`[planwise-mcp] HTTP listening on http://${HOST}:${PORT}`);
      console.error(`[planwise-mcp] MCP endpoint: http://${HOST}:${PORT}/mcp`);
      resolve();
    });
    server.on("error", reject);
  });
}
