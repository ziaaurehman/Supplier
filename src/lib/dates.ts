const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date as YYYY-MM-DD in the browser's local time zone. */
export function todayLocalISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Client-side check for a YYYY-MM-DD value earlier than the user's local today. */
export function isPastLocalDate(ymd: string): boolean {
  return !!ymd && ymd < todayLocalISO();
}

/**
 * Server-side check for a date-only value. Allows one day of leeway because the
 * server runs in UTC while users pick "today" in their own time zone.
 */
export function isPastDateForServer(value: string | Date): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const todayUtc = new Date(new Date().toISOString().slice(0, 10)).getTime();
  return date.getTime() < todayUtc - DAY_MS;
}

/** Deadlines are date-only; a deadline stays open until the end of that day. */
export function isDeadlinePassed(deadline: Date | string | null | undefined, now = new Date()): boolean {
  if (!deadline) return false;
  return now.getTime() >= new Date(deadline).getTime() + DAY_MS;
}
