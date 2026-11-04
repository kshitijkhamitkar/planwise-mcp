/** Parse YYYY-MM-DD as UTC midnight. */
export function parseUtcDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

/** Inclusive end-of-day UTC for YYYY-MM-DD. */
export function endOfUtcDay(dateStr: string): Date {
  const start = parseUtcDate(dateStr);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function assertDateRange(startDate: string, endDate: string): void {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  if (end < start) {
    throw new Error("endDate must be on or after startDate");
  }
}
