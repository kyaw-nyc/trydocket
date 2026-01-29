import { HOUR_HEIGHT } from "../types/calendar";

export const MS_IN_DAY = 1000 * 60 * 60 * 24;

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getWeekDates(baseDate: Date): Date[] {
  const start = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function getMonthMatrix(date: Date): Date[] {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function formatDateHeader(date: Date): { day: string; date: number } {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return { day: days[date.getDay()], date: date.getDate() };
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function getCurrentTimePosition(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes / 60) * HOUR_HEIGHT;
}

export function getTimeZoneAbbr(): string {
  const tz = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return tz || "";
}

export function weekRangeLabel(weekDates: Date[]): string {
  if (weekDates.length === 0) return "";
  const start = weekDates[0];
  const end = weekDates[weekDates.length - 1];
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.toLocaleString([], { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleString([], { month: "short" })} ${start.getDate()} – ${end.toLocaleString([], { month: "short" })} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${start.toLocaleString([], { month: "short" })} ${start.getDate()}, ${start.getFullYear()} – ${end.toLocaleString([], { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
}

export function formatEventTimeRange(startString?: string, endString?: string): string {
  if (!startString) return "";
  const start = new Date(startString);
  const formatter = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });
  const startTime = formatter.format(start);
  if (!endString) return startTime;
  const endTime = formatter.format(new Date(endString));
  return `${startTime} – ${endTime}`;
}

export function formatDateRange(start?: string, end?: string): string {
  if (!start) return "";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const dateLabel = startDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const timeLabel = `${timeFormatter.format(startDate)}${endDate ? ` – ${timeFormatter.format(endDate)}` : ""}`;
  return `${dateLabel} · ${timeLabel}`;
}
