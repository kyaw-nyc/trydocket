import { HOUR_HEIGHT } from "../types/calendar";

/** Pixels per 15-minute snap interval */
export const SNAP_PX = HOUR_HEIGHT / 4; // 14px

/** Round a pixel value to the nearest snap increment */
export function snapToGrid(px: number): number {
  return Math.round(px / SNAP_PX) * SNAP_PX;
}

/** Convert pixels to minutes (from midnight) */
export function pxToMinutes(px: number): number {
  return (px / HOUR_HEIGHT) * 60;
}

/** Convert minutes to pixels */
export function minutesToPx(min: number): number {
  return (min / 60) * HOUR_HEIGHT;
}

/** Round minutes to nearest 15-minute interval */
export function snapMinutes(min: number): number {
  return Math.round(min / 15) * 15;
}

/** Build an ISO datetime string from a base date and minutes from midnight */
export function buildDateTime(baseDate: Date, minutesFromMidnight: number): string {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutesFromMidnight);
  return d.toISOString();
}

/** Format minutes-from-midnight as a time string, e.g. "2:30 PM" */
export function formatTimeFromMinutes(min: number): string {
  const clamped = Math.max(0, Math.min(min, 24 * 60));
  const h = Math.floor(clamped / 60);
  const m = Math.round(clamped % 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const displayM = m.toString().padStart(2, "0");
  return `${displayH}:${displayM} ${period}`;
}
