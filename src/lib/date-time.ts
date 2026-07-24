const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function dateInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function parseDateOnly(date: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY_PATTERN.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

export function addCalendarDays(date: string, days: number): string {
  const parts = parseDateOnly(date);
  if (!parts) throw new RangeError(`Invalid date-only value: ${date}`);
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return value.toISOString().slice(0, 10);
}

export function formatDateOnly(
  date: string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  const parts = parseDateOnly(date);
  if (!parts) return date;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day)),
  );
}

export function formatTimestamp(
  timestamp: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
  locale = "en-US",
): string {
  const instant = new Date(timestamp);
  if (Number.isNaN(instant.valueOf())) return timestamp;
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: validTimeZone(timeZone),
  }).format(instant);
}

export function timestampToDateTimeLocal(timestamp: string, timeZone: string): string {
  const instant = new Date(timestamp);
  if (Number.isNaN(instant.valueOf())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function dateTimeLocalToTimestamp(value: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const desiredWallTime = Date.parse(`${value}:00.000Z`);
  if (Number.isNaN(desiredWallTime)) return null;

  let candidate = desiredWallTime;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const rendered = timestampToDateTimeLocal(new Date(candidate).toISOString(), timeZone);
    const renderedWallTime = Date.parse(`${rendered}:00.000Z`);
    if (Number.isNaN(renderedWallTime)) return null;
    candidate += desiredWallTime - renderedWallTime;
  }

  const result = new Date(candidate);
  return timestampToDateTimeLocal(result.toISOString(), timeZone) === value
    ? result.toISOString()
    : null;
}
