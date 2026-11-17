# Deploy PlanWise MCP for ChatGPT

This guide assumes the repo supports both transports:

- **Local:** `MCP_TRANSPORT=stdio`
- **Hosted / ChatGPT:** `MCP_TRANSPORT=http` + public HTTPS `/mcp`

---

## 1. MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/cloud/atlas  
2. Create a DB user + password  
3. Network Access → allow `0.0.0.0/0` (or your host IPs)  
4. Copy connection string, set DB name to `planwise`:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/planwise?retryWrites=true&w=majority
```

5. Seed from your laptop (temporary `.env`):

```bash
# .env
MONGODB_URI=<atlas-uri>
MCP_TRANSPORT=stdio
npm run seed
npm run smoke
```

---

## 2. Environment variables on the host

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | Atlas URI |
| `MCP_TRANSPORT` | `http` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` (or platform default) |
| `API_KEY` | long random secret |
| `ALLOW_INSECURE_HTTP` | `false` |

Do **not** commit real secrets. Set them in Railway/Render/Fly dashboard.

---

## 3. Deploy (Railway / Render / similar)

1. Connect GitHub repo `planwise-mcp`  
2. Build command: `npm install && npm run build`  
3. Start command: `npm start`  
4. Set env vars above  
5. Wait for deploy; open:

```text
https://<your-host>/health
https://<your-host>/
```

MCP URL for ChatGPT:

```text
https://<your-host>/mcp
```

Auth header:

```text
Authorization: Bearer <API_KEY>
```

(or `X-API-Key: <API_KEY>`)

---

## 4. Connect ChatGPT

1. ChatGPT (web) → Plugins / Apps → **Add custom MCP server**  
2. Server URL: `https://<your-host>/mcp`  
3. Auth: Bearer / API key with your `API_KEY`  
4. Install / enable the plugin  
5. Confirm tools appear, then ask:

> Which products are at stockout risk in the next 14 days?

Use the same ChatGPT account on mobile after the connector is added (plan permitting).

---

## 5. Keep localhost working

```bash
# .env for laptop
MONGODB_URI=mongodb://127.0.0.1:27017/planwise
MCP_TRANSPORT=stdio
docker compose up -d mongo
npm run dev
```

Local MCP client config stays stdio. Deployed service stays HTTP + Atlas.

---

## 6. Optional: test HTTP locally before deploy

```bash
# .env
MCP_TRANSPORT=http
API_KEY=local-test-key
HOST=127.0.0.1
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/planwise

npm run start:env
curl http://127.0.0.1:3000/health
```
