const DAY = 86400000;
/** Schengen application dates cannot predate the agreement; no duration cap is imposed. */
export function applicationDay(
  value: string | null | undefined,
): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1985) return null;
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? timestamp
    : null;
}
export function processingDays(
  start: string | null | undefined,
  end: string | null | undefined,
  now = Date.now(),
): number | null {
  const a = applicationDay(start),
    b = applicationDay(end);
  if (a === null || b === null || b < a || b > now) return null;
  return Math.round((b - a) / DAY);
}
