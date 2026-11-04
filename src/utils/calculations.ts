/** Weighted moving average over up to 4 weekly buckets (newest first). */
export function weightedMovingAverageDaily(dailyDemand: number[]): number {
  if (dailyDemand.length === 0) return 0;

  const weeks: number[] = [];
  for (let i = 0; i < 4; i++) {
    const slice = dailyDemand.slice(i * 7, i * 7 + 7);
    if (slice.length === 0) break;
    const weekSum = slice.reduce((a, b) => a + b, 0);
    weeks.push(weekSum / slice.length);
  }

  const weights = [0.4, 0.3, 0.2, 0.1].slice(0, weeks.length);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weighted = weeks.reduce((sum, avg, i) => sum + avg * weights[i], 0);
  return weightSum === 0 ? 0 : weighted / weightSum;
}

export function availableStock(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export function recommendedReplenishmentQty(params: {
  forecastDemand: number;
  safetyStock: number;
  available: number;
}): number {
  const raw = params.forecastDemand + params.safetyStock - params.available;
  return Math.max(0, Math.ceil(raw));
}

export function daysOfCover(available: number, avgDailyDemand: number): number {
  const eps = 0.0001;
  return available / Math.max(avgDailyDemand, eps);
}

export type RiskLevel = "high" | "medium";

export function classifyStockoutRisk(
  daysCover: number,
  leadTimeDays: number,
  horizonDays: number,
): RiskLevel | null {
  if (daysCover < leadTimeDays) return "high";
  if (daysCover <= horizonDays) return "medium";
  return null;
}
