import { CalendarEvent, PositionedEvent, HOUR_HEIGHT } from "../types/calendar";

export function getEventTimes(event: CalendarEvent): { start: Date; end: Date } | null {
  const startString = event.start?.dateTime || event.start?.date;
  const endString = event.end?.dateTime || event.end?.date;
  if (!startString) return null;
  const start = new Date(startString);
  const end = endString ? new Date(endString) : new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export function getEventPosition(
  event: CalendarEvent | { start: { dateTime: string }; end: { dateTime: string } }
): { top: number; height: number } | null {
  const startDateTime = "start" in event && event.start && "dateTime" in event.start
    ? event.start.dateTime
    : null;
  if (!startDateTime) return null;

  const start = new Date(startDateTime);
  const totalSeconds = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
  const top = (totalSeconds / 3600) * HOUR_HEIGHT;

  let durationMinutes = 60;
  const endDateTime = "end" in event && event.end && "dateTime" in event.end
    ? event.end.dateTime
    : null;
  if (endDateTime) {
    const end = new Date(endDateTime);
    durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  }

  // Minimum height for readability - small enough to fit in gaps but readable
  // 18px minimum allows title to show; EventCard handles hiding time/location for short events
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 18);
  return { top, height };
}

// Lay out overlapping events into columns (Google Calendar style)
export function layoutDayEvents(events: CalendarEvent[]): PositionedEvent[] {
  const enriched: PositionedEvent[] = [];

  events.forEach((event) => {
    const times = getEventTimes(event);
    const pos = getEventPosition(event);
    if (!times || !pos) return;
    enriched.push({
      event,
      top: pos.top,
      height: pos.height,
      startMs: times.start.getTime(),
      endMs: times.end.getTime(),
      col: 0,
      cols: 1,
      leftPercent: 0,
      widthPercent: 100,
    });
  });

  // Sort by start then duration
  enriched.sort((a, b) => (a.startMs === b.startMs ? a.endMs - b.endMs : a.startMs - b.startMs));

  const positioned: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const withCols: PositionedEvent[] = [];

    cluster.forEach((item) => {
      let col = columnEnds.findIndex((end) => end <= item.startMs);
      if (col === -1) {
        columnEnds.push(item.endMs);
        col = columnEnds.length - 1;
      } else {
        columnEnds[col] = item.endMs;
      }
      withCols.push({ ...item, col });
    });

    const cols = columnEnds.length || 1;
    const gap = 0; // no gap to mimic Google Calendar flush columns
    const width = 100 / cols;

    withCols.forEach((item) => {
      const left = item.col * (width + gap);
      positioned.push({
        ...item,
        cols,
        leftPercent: left,
        widthPercent: width,
      });
    });

    cluster = [];
    clusterEnd = -Infinity;
  };

  enriched.forEach((item) => {
    if (item.startMs >= clusterEnd) {
      flushCluster();
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMs);
  });
  flushCluster();

  return positioned;
}
