import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { loadEnv } from "../config/environment.js";
import { createMcpServer } from "./server.js";
import { requireApiKey } from "./auth.js";

type SessionRecord = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createMcpServer>;
};

const sessions = new Map<string, SessionRecord>();

function isInitializeRequest(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : [body];
  return messages.some(
    (msg) =>
      typeof msg === "object" &&
      msg !== null &&
      "method" in msg &&
      (msg as { method?: string }).method === "initialize",
  );
}

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  try {
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Mcp-Session-Id, mcp-session-id",
    );

    const sessionId = req.header("mcp-session-id") ?? undefined;
    const existing = sessionId ? sessions.get(sessionId) : undefined;

    if (existing) {
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, server });
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id) sessions.delete(id);
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (sessionId) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Session not found" },
        id: null,
      });
      return;
    }

    // Stateless fallback for simple single-shot clients
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (err) {
    console.error("[planwise-mcp] HTTP MCP handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}

export async function startHttpServer(): Promise<void> {
  const { PORT, HOST, MCP_AUTH_MODE, API_KEY } = loadEnv();

  if (MCP_AUTH_MODE === "api_key" && !API_KEY) {
    throw new Error(
      "HTTP mode with MCP_AUTH_MODE=api_key requires API_KEY (or set MCP_AUTH_MODE=none for ChatGPT).",
    );
  }

  if (MCP_AUTH_MODE === "none") {
    console.error(
      "[planwise-mcp] WARNING: MCP_AUTH_MODE=none — /mcp is open. Use only with synthetic demo data.",
    );
  }

  const app = createMcpExpressApp({ host: HOST });

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key, Mcp-Session-Id, mcp-session-id, Accept",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "planwise-mcp",
      transport: "http",
      mcpPath: "/mcp",
      authMode: MCP_AUTH_MODE,
    });
  });

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "planwise-mcp",
      version: "0.1.0",
      mcp: "/mcp",
      health: "/health",
      authMode: MCP_AUTH_MODE,
      auth:
        MCP_AUTH_MODE === "none"
          ? "No authentication (ChatGPT-compatible)"
          : "Authorization: Bearer <API_KEY> or X-API-Key: <API_KEY>",
    });
  });

  app.post("/mcp", requireApiKey, (req, res) => {
    void handleMcpRequest(req, res);
  });
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
