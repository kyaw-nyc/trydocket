export type SimpleEvent = {
  startDateTime: string;
  endDateTime: string;
  colorId?: string;
};

const COLOR_SEQUENCE = ["9", "5"] as const; // two contrasting calendar colors
const ADJACENT_MINUTES = 15;

function diffMinutes(a: number, b: number): number {
  return (a - b) / 60000;
}

/**
 * Choose a colorId for a newly proposed event so adjacent events alternate colors.
 * - Only toggles between two colors to keep the UI consistent.
 * - If the closest previous event ends within ADJACENT_MINUTES before the new start,
 *   use the opposite color; otherwise start with the first color.
 */
export function selectColorId(
  existing: SimpleEvent[],
  candidateStart: string
): string {
  const startMs = Date.parse(candidateStart);
  const sorted = [...existing].sort(
    (a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime)
  );

  let lastAdjacentColor: string | undefined;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const ev = sorted[i];
    const endMs = Date.parse(ev.endDateTime);
    const minutesGap = diffMinutes(startMs, endMs);

    // If this event ends after the candidate starts, skip (overlap or starts before)
    if (minutesGap < -1) continue;

    if (minutesGap <= ADJACENT_MINUTES) {
      lastAdjacentColor = ev.colorId;
      break;
    }

    // Too far back in time—stop searching
    if (minutesGap > ADJACENT_MINUTES) break;
  }

  if (!lastAdjacentColor) return COLOR_SEQUENCE[0];

  const idx = COLOR_SEQUENCE.indexOf(lastAdjacentColor as typeof COLOR_SEQUENCE[number]);
  if (idx === -1) return COLOR_SEQUENCE[0];

  return COLOR_SEQUENCE[(idx + 1) % COLOR_SEQUENCE.length];
}

export const ADJACENT_COLOR_IDS = COLOR_SEQUENCE;
export const ADJACENT_WINDOW_MINUTES = ADJACENT_MINUTES;
