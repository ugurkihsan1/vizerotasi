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

/** Display date-only values without shifting their calendar day. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  })
    .format(date)
    .replace(/\./g, "/");
}
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return `${formatDate(value)} ${new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(date)}`;
}

/** Compact relative age for public posts; calendar dates remain available elsewhere. */
export function relativePostTime(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "şimdi";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa`;
  const days = Math.floor(seconds / 86400);
  if (days < 30) return `${days} gün`;
  if (days < 365) return `${Math.floor(days / 30)} ay`;
  return `${Math.floor(days / 365)} yıl`;
}
