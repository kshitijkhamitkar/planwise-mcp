# PlanWise MCP — Tool Contracts (MVP)

Global rules apply to every tool. Implement tools exactly against these contracts.

## Global conventions

| Rule | Value |
|------|--------|
| Currency | INR, stored and returned as integer **paise** (`1 INR = 100 paise`) |
| Quantities | Non-negative integers (units) |
| Dates | ISO `YYYY-MM-DD`, interpreted as **UTC** |
| Date ranges | Inclusive `startDate` and inclusive `endDate` |
| IDs | Stable string business IDs (`productId`, `customerId`, …), not Mongo `_id` |
| Money fields | Always end with `Paise` |
| Unknown IDs | Structured error, do not invent data |
| Empty results | Success with empty arrays / zero totals (not an error) |
| Auth (MVP) | Local demo, read-only tools, no OAuth |
| Transport (MVP) | **stdio** first; Streamable HTTP optional later |

### Shared error shape

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INPUT | NOT_FOUND | INTERNAL",
    "message": "Human-readable explanation"
  }
}
```

### Shared success envelope

Every tool returns:

```json
{
  "ok": true,
  "data": { }
}
```

### Replenishment / demand formula (single source of truth)

```text
available        = onHand - reserved
forecastDemand   = weighted_moving_average(daily demand) * horizonDays
                   (use last 28 days of sales; missing days = 0)
recommendedQty   = max(0, ceil(forecastDemand + safetyStock - available))
stockoutRiskDays = available / max(avgDailyDemand, ε)
```

Weighted moving average weights for last 4 weeks (newest → oldest): `0.4, 0.3, 0.2, 0.1`.

---

## 1. `get_sales_summary`

**Use when:** User asks for total revenue, units sold, or overall sales for a period.

### Input

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `startDate` | string | yes | `YYYY-MM-DD` |
| `endDate` | string | yes | `YYYY-MM-DD`, must be ≥ `startDate` |
| `productId` | string | no | Filter to one product |
| `region` | string | no | Filter via customer region |

### Output `data`

```json
{
  "startDate": "2025-08-01",
  "endDate": "2025-08-31",
  "filters": { "productId": null, "region": null },
  "totalRevenuePaise": 12500000,
  "totalUnits": 1840,
  "orderCount": 620,
  "avgOrderValuePaise": 20161
}
```

### Errors

- `INVALID_INPUT` — bad dates or `endDate < startDate`
- `NOT_FOUND` — `productId` provided but unknown

---

## 2. `get_top_products`

**Use when:** User asks which products sold best by revenue or quantity.

### Input

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `startDate` | string | yes | `YYYY-MM-DD` |
| `endDate` | string | yes | `YYYY-MM-DD` |
| `metric` | string | no | `"revenue"` (default) or `"quantity"` |
| `limit` | number | no | Integer 1–50, default `5` |

### Output `data`

```json
{
  "startDate": "2025-08-01",
  "endDate": "2025-08-31",
  "metric": "revenue",
  "limit": 5,
  "products": [
    {
      "rank": 1,
      "productId": "P-001",
      "name": "Steel Bottle 1L",
      "category": "Drinkware",
      "revenuePaise": 2500000,
      "unitsSold": 400
    }
  ]
}
```

### Errors

- `INVALID_INPUT` — bad dates, metric, or limit

---

## 3. `get_inventory_status`

**Use when:** User asks current stock levels, warehouse inventory, or stock for a product.

### Input

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `productId` | string | no | If omitted, return all products |
| `warehouseId` | string | no | Default `"WH-MAIN"` in seed data |

### Output `data`

```json
{
  "warehouseId": "WH-MAIN",
  "items": [
    {
      "productId": "P-001",
      "name": "Steel Bottle 1L",
      "onHand": 120,
      "reserved": 15,
      "available": 105,
      "reorderLevel": 40,
      "safetyStock": 20,
      "leadTimeDays": 7,
      "belowReorderLevel": false
    }
  ]
}
```

### Errors

- `NOT_FOUND` — unknown `productId` or `warehouseId` with no rows

---

## 4. `detect_stockout_risk`

**Use when:** User asks which products may run out soon / within N days.

### Input

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `horizonDays` | number | no | Integer 1–90, default `14` |
| `warehouseId` | string | no | Default `"WH-MAIN"` |

### Output `data`

```json
{
  "horizonDays": 14,
  "warehouseId": "WH-MAIN",
  "atRisk": [
    {
      "productId": "P-014",
      "name": "Ceramic Mug Blue",
      "available": 18,
      "avgDailyDemand": 3.2,
      "daysOfCover": 5.6,
      "reorderLevel": 25,
      "leadTimeDays": 7,
      "riskLevel": "high"
    }
  ]
}
```

### Risk levels

| `riskLevel` | Rule |
|-------------|------|
| `high` | `daysOfCover < leadTimeDays` |
| `medium` | `daysOfCover <= horizonDays` |
| _(omit)_ | Not at risk — do not include in `atRisk` |

Sort `atRisk` by ascending `daysOfCover`.

### Errors

- `INVALID_INPUT` — bad `horizonDays`

---

## 5. `recommend_replenishment`

**Use when:** User asks how much to reorder / replenish for a product (or top risks).

### Input

| Field | Type | Required | Rules |
|-------|------|----------|--------|
| `productId` | string | yes | Must exist |
| `horizonDays` | number | no | Integer 1–90, default `30` |
| `warehouseId` | string | no | Default `"WH-MAIN"` |

### Output `data`

```json
{
  "productId": "P-014",
  "name": "Ceramic Mug Blue",
  "warehouseId": "WH-MAIN",
  "horizonDays": 30,
  "onHand": 30,
  "reserved": 12,
  "available": 18,
  "safetyStock": 20,
  "leadTimeDays": 7,
  "avgDailyDemand": 3.2,
  "forecastDemand": 96,
  "recommendedQty": 98,
  "rationale": "Forecast 96 units over 30 days + safety stock 20 − available 18."
}
```

### Errors

- `INVALID_INPUT` — bad `horizonDays`
- `NOT_FOUND` — unknown product/warehouse inventory row

---

## Demo prompts (for README / video)

1. "Summarize sales for August 2025."
2. "What were the top 5 products by revenue last month?"
3. "Show inventory status for all products."
4. "Which products might stock out in the next 10 days?"
5. "How much should we replenish for product P-014 for the next 30 days?"

Expected tool sequence for a blended question like  
*"Which products are at stockout risk, and how much should we reorder for the worst one?"*:

1. `detect_stockout_risk`
2. `recommend_replenishment` with that `productId`
