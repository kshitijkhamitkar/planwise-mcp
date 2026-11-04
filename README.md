# PlanWise MCP

AI-powered **sales & demand planning** tools exposed through the **Model Context Protocol (MCP)**.

Connect PlanWise to any MCP-compatible client, then ask natural-language questions about sales, inventory, stockout risk, and replenishment. The server runs predefined tools against a MongoDB dataset and returns structured JSON.

---

## Features

- **5 MCP tools** for sales analytics, inventory status, stockout risk, and replenishment
- **Modular backend**: tools → services → repositories → MongoDB
- **Zod** input validation on every tool
- **Demand planning** with weighted moving average forecasting (TypeScript)
- **Synthetic dataset**: ~30 products, 100 customers, 12 months of sales, inventory + movements
- **Docker Compose** for local MongoDB
- **stdio transport** for local demos (no cloud hosting required)

## Tech stack

| Area | Technology |
|------|------------|
| Runtime | Node.js, TypeScript |
| Protocol | Model Context Protocol (`@modelcontextprotocol/sdk`) |
| Database | MongoDB 7, Mongoose |
| Validation | Zod |
| Containers | Docker, Docker Compose |
| Testing | Vitest |

## Architecture

```text
MCP-compatible AI client
        │  MCP over stdio
        ▼
MCP server (tool registry + Zod validation)
        ▼
services (sales / inventory / planning)
        ▼
repositories (Mongo aggregations)
        ▼
MongoDB (products, customers, sales, inventory, movements)
```

## MCP tools

| Tool | Description |
|------|-------------|
| `get_sales_summary` | Revenue, units, order stats for a date range |
| `get_top_products` | Top products by revenue or quantity |
| `get_inventory_status` | On-hand, reserved, available, reorder thresholds |
| `detect_stockout_risk` | Products likely to run out within N days |
| `recommend_replenishment` | Suggested reorder qty using WMA forecast + safety stock |

Full input/output contracts: [`docs/TOOL_CONTRACTS.md`](docs/TOOL_CONTRACTS.md)

## Quick start

### Prerequisites

- Node.js 20+
- Docker Desktop
- Git

### 1. Clone & install

```bash
git clone https://github.com/kshitijkhamitkar/planwise-mcp.git
cd planwise-mcp
cp .env.example .env
npm install
```

### 2. Start MongoDB

```bash
docker compose up -d mongo
```

### 3. Seed synthetic data

```bash
npm run seed
```

### 4. Smoke-test tools (without MCP)

```bash
npm run smoke
npm test
```

### 5. Run the MCP server

```bash
npm run dev
```

## Connect an MCP client

Add a stdio MCP server entry that runs this project. Example:

```json
{
  "mcpServers": {
    "planwise": {
      "command": "npx",
      "args": [
        "tsx",
        "--env-file=/absolute/path/to/planwise-mcp/.env",
        "/absolute/path/to/planwise-mcp/src/index.ts"
      ],
      "env": {
        "MONGODB_URI": "mongodb://127.0.0.1:27017/planwise",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Update the absolute paths for your machine. Keep Docker/Mongo running, then try prompts such as:

- “Which products are at stockout risk in the next 14 days?”
- “Recommend replenishment for P-014 for 30 days.”
- “Summarize sales for October 2026.”

More examples: [`configs/`](configs/)

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx tsx --env-file=.env src/index.ts
```

## Project structure

```text
planwise-mcp/
├── configs/                 # Example MCP client configs
├── docs/TOOL_CONTRACTS.md   # Tool I/O contracts
├── scripts/
│   ├── seedDatabase.ts      # Synthetic data generator
│   └── smokeTools.ts        # Direct service smoke test
├── src/
│   ├── config/              # Env + Mongo connection
│   ├── models/              # Mongoose schemas
│   ├── repositories/        # DB queries
│   ├── services/            # Business logic
│   ├── tools/               # Zod schemas / tool names
│   ├── mcp/                 # MCP server + stdio
│   ├── utils/               # Dates, forecast math, errors
│   └── index.ts
├── tests/
├── docker-compose.yml
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run seed` | Seed MongoDB |
| `npm run smoke` | Call all 5 tools via services |
| `npm run dev` | Start MCP server (stdio) |
| `npm test` | Run Vitest unit tests |
| `npm run build` | Compile TypeScript |

## Design notes

- Tools call **services**, not the database directly.
- Money is stored/returned in **paise** (INR × 100).
- Dates use `YYYY-MM-DD` in UTC.
- Forecasting uses a weighted moving average so the focus stays on MCP tool design.

## License

MIT
