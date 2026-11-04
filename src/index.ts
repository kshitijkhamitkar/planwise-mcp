import { connectDatabase } from "./config/database.js";
import { startStdioServer } from "./mcp/server.js";
import { getTransportMode } from "./mcp/transport.js";

async function main() {
  const transport = getTransportMode();
  console.error(`[planwise-mcp] starting (transport=${transport})`);

  await connectDatabase();
  console.error("[planwise-mcp] MongoDB connected");

  if (transport !== "stdio") {
    console.error(
      "[planwise-mcp] Only stdio is implemented in MVP. Set MCP_TRANSPORT=stdio.",
    );
    process.exit(1);
  }

  await startStdioServer();
}

main().catch((err) => {
  console.error("[planwise-mcp] fatal:", err);
  process.exit(1);
});
