/**
 * Utility functions for expanding RRULE recurrence patterns into individual event instances
 */

type RecurrenceOptions = {
  startDateTime: string;
  endDateTime: string;
  recurrence?: string[];
  maxInstances?: number; // Limit total instances to prevent infinite loops
};

type ExpandedInstance = {
  startDateTime: string;
  endDateTime: string;
  instanceIndex: number;
};

/**
 * Parse RRULE string into components
 */
function parseRRule(rrule: string): Record<string, string> {
  const rule = rrule.replace("RRULE:", "");
  const parts: Record<string, string> = {};

  rule.split(";").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      parts[key.toUpperCase()] = value;
    }
  });

  return parts;
}

/**
 * Add days/weeks/months/years to a date
 */
function addToDate(date: Date, freq: string, interval: number): Date {
  const result = new Date(date);

  switch (freq) {
    case "DAILY":
      result.setDate(result.getDate() + interval);
      break;
    case "WEEKLY":
      result.setDate(result.getDate() + interval * 7);
      break;
    case "MONTHLY":
      result.setMonth(result.getMonth() + interval);
      break;
    case "YEARLY":
      result.setFullYear(result.getFullYear() + interval);
      break;
  }

  return result;
}

/**
 * Expand a recurring event into individual instances
 * Returns array of start/end datetime pairs for each instance
 * ALWAYS returns at least the original event to prevent events from disappearing
 */
export function expandRecurrence(options: RecurrenceOptions): ExpandedInstance[] {
  const { startDateTime, endDateTime, recurrence, maxInstances = 100 } = options;

  // Always have a fallback single instance
  const fallbackInstance: ExpandedInstance = { startDateTime, endDateTime, instanceIndex: 0 };

  try {
    // Validate inputs
    if (!startDateTime || !endDateTime) {
      console.warn("expandRecurrence: Missing start or end datetime");
      return [fallbackInstance];
    }

    // If no recurrence, return single instance
    if (!recurrence || recurrence.length === 0) {
      return [fallbackInstance];
    }

    const rruleStr = recurrence.find((r) => r.startsWith("RRULE:"));
    if (!rruleStr) {
      return [fallbackInstance];
    }

    const rule = parseRRule(rruleStr);
    const freq = rule.FREQ;
    const count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
    const until = rule.UNTIL ? new Date(rule.UNTIL.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")) : null;
    const interval = rule.INTERVAL ? parseInt(rule.INTERVAL, 10) : 1;

    if (!freq) {
      return [fallbackInstance];
    }

    const instances: ExpandedInstance[] = [];
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn("expandRecurrence: Invalid date", { startDateTime, endDateTime });
      return [fallbackInstance];
    }

    const duration = endDate.getTime() - startDate.getTime();

    let currentStart = new Date(startDate);
    let instanceCount = 0;
    const maxCount = count || maxInstances;

    // Generate instances
    while (instanceCount < maxCount) {
      // Check UNTIL constraint
      if (until && currentStart > until) {
        break;
      }

      // Check max instances safety limit
      if (instanceCount >= maxInstances) {
        break;
      }

      const instanceStart = currentStart.toISOString();
      const instanceEnd = new Date(currentStart.getTime() + duration).toISOString();

      instances.push({
        startDateTime: instanceStart,
        endDateTime: instanceEnd,
        instanceIndex: instanceCount,
      });

      instanceCount++;
      currentStart = addToDate(currentStart, freq, interval);
    }

    // Always return at least the original event
    return instances.length > 0 ? instances : [fallbackInstance];
  } catch (error) {
    console.error("expandRecurrence error:", error);
    return [fallbackInstance];
  }
}

/**
 * Check if a date falls within the visible week range (with some buffer)
 */
export function isInWeekRange(dateStr: string, weekDates: Date[]): boolean {
  if (!weekDates.length) return false;

  const date = new Date(dateStr);
  const weekStart = new Date(weekDates[0]);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekDates[weekDates.length - 1]);
  weekEnd.setHours(23, 59, 59, 999);

  return date >= weekStart && date <= weekEnd;
}
