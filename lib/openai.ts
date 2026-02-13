import OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { DateTime } from "luxon";

// ===== Constants & Types =====================================================

const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const ISO_OUTPUT_OPTIONS = {
  suppressMilliseconds: true,
  includeOffset: true,
} as const;

const ISO_STRING_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/;

export type RoundingMode = "nearest" | "ceil";

export interface RoundingOptions {
  timeZone?: string;
  mode?: RoundingMode;
}

// ===== OpenAI Client ========================================================

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "OPENAI_API_KEY is not set. The OpenAI client will fail at runtime until the key is provided."
  );
}

/**
 * Shared OpenAI client for the calendar assistant.
 * Uses the environment variable OPENAI_API_KEY. Configure baseURL separately if needed.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

// ===== Date/Time Utilities ===================================================

/**
 * Cheap sanity check for ISO-8601 strings before deeper parsing.
 */
export function isValidIsoString(value: string): boolean {
  if (typeof value !== "string" || !ISO_STRING_PATTERN.test(value)) return false;
  const dt = DateTime.fromISO(value, { setZone: true });
  return dt.isValid;
}

/**
 * Throws when the provided value is not a valid ISO-8601 string.
 */
export function assertIsoString(value: string, label = "date/time"): string {
  if (!isValidIsoString(value)) {
    throw new Error(`Invalid ISO ${label}: "${value}"`);
  }
  return value;
}

function resolveTimeZone(isoString: string, explicit?: string): string {
  if (explicit) return explicit;
  const fromIso = DateTime.fromISO(isoString, { setZone: true });
  if (fromIso.isValid && fromIso.zone?.isValid) return fromIso.zoneName;
  return DEFAULT_TIMEZONE;
}

/**
 * Parse an ISO string into a Luxon DateTime in the desired zone.
 * - If a zone is provided, interpret the wall-clock time in that zone (ignores any offset in the string).
 * - Otherwise respect the offset/zone encoded in the string; fallback to DEFAULT_TIMEZONE.
 */
export function parseIsoToDateTime(
  isoString: string,
  timeZone?: string
): DateTime {
  assertIsoString(isoString);
  const zone = resolveTimeZone(isoString, timeZone);

  // When a zone is supplied we interpret the wall time in that zone; otherwise keep the zone from the ISO string.
  const dt = DateTime.fromISO(isoString, {
    zone,
    setZone: timeZone ? false : true,
  });

  if (!dt.isValid) {
    throw new Error(
      `Unable to parse date/time "${isoString}" in zone "${zone}": ${dt.invalidReason ?? "unknown error"}`
    );
  }

  return dt;
}

/**
 * Format a DateTime or ISO string as ISO-8601 in the specified zone (defaults to the value's zone).
 */
export function formatIsoInTimeZone(
  value: string | DateTime,
  timeZone?: string
): string {
  const dt =
    typeof value === "string"
      ? parseIsoToDateTime(value, timeZone)
      : value.setZone(resolveTimeZone(value.toISO() ?? "", timeZone));

  const iso = dt.toISO(ISO_OUTPUT_OPTIONS);
  if (!iso) throw new Error("Failed to format ISO date/time");
  return iso;
}

function roundDateTimeToInterval(
  dt: DateTime,
  intervalMinutes: number,
  mode: RoundingMode
): DateTime {
  const remainder = dt.minute % intervalMinutes;
  const hasSubMinute = dt.second !== 0 || dt.millisecond !== 0;
  const base = dt.set({ second: 0, millisecond: 0 });

  if (remainder === 0 && !hasSubMinute) return base;

  if (mode === "ceil") {
    const delta = remainder === 0 ? intervalMinutes : intervalMinutes - remainder;
    return base.plus({ minutes: delta });
  }

  // Nearest: ties (2.5 min) round up
  const halfway = intervalMinutes / 2;
  const delta = remainder < halfway ? -remainder : intervalMinutes - remainder;
  return base.plus({ minutes: delta });
}

/**
 * Round to the nearest 5-minute mark in the provided timezone (default: inferred from the ISO string or system).
 * Handles minute overflow, day rollover, and DST transitions via Luxon.
 */
export function roundToNearest5Minutes(
  isoString: string,
  timeZone?: string
): string {
  const dt = parseIsoToDateTime(isoString, timeZone);
  const rounded = roundDateTimeToInterval(dt, 5, "nearest");
  return formatIsoInTimeZone(rounded, dt.zoneName);
}

/**
 * Round up to the next 5-minute boundary (ceiling) in the provided timezone.
 */
export function roundUpToNext5Minutes(
  isoString: string,
  timeZone?: string
): string {
  const dt = parseIsoToDateTime(isoString, timeZone);
  const rounded = roundDateTimeToInterval(dt, 5, "ceil");
  return formatIsoInTimeZone(rounded, dt.zoneName);
}

// ===== System Prompt Construction ===========================================

const CORE_INSTRUCTIONS = `You are Docket, a fast and friendly calendar assistant. Be concise, warm, and actionable.

## Rules
- NEVER guess event IDs — always list_events first
- Respect exact dates: "February 26th" = 02-26. Treat ordinals carefully
- Missing am/pm with 1-12: ask before guessing
- Missing timezone: use user's timezone. Missing year: current year (next year if past)
- "next Monday" = following week's Monday. "this Monday" = current week's Monday
- Default duration: user's preferred_meeting_duration or 30 min
- Round times to nearest 5 min. "start now" rounds UP to next 5 min
- All-day events: date-only start, end = next day (RFC 5545)

## Workflow
1. Questions/chat only → answer directly, no tools
2. Missing info → ask ONE clarifying question
3. Create event → propose_event (never create directly). Check conflicts with list_events first
4. Recurring → single event with RRULE. Bound with UNTIL when user sets end
5. Update → list_events to get ID, then update_event
6. Delete → list_events to get ID, then propose_delete_event. For series: use scope="all" + seriesEventId unless user says "this one only"
7. Cancel intent ("stop", "cancel", "nvm", "don't add") → call cancel_pending_events
8. Cancel delete ("keep it", "don't delete") → call cancel_pending_deletions
9. Always include timeZone and calendarId when relevant
10. Keep replies short — 1-2 sentences max unless listing events`;

const PREFERENCES_GUIDANCE = `## Preferences
- Save recurring preferences with save_preference (not one-time requests)
- Apply saved preferences when scheduling
- Keys: preferred_meeting_duration, preferred_time_of_day, no_events_before, no_events_after`;

export type CalendarInfo = {
  id: string;
  name: string;
  isPrimary?: boolean;
};

export type UserPreference = {
  key: string;
  value: string;
};

/**
 * Build the system prompt with strong calendar safety guardrails.
 */
export function getSystemPrompt(
  currentTime: string,
  userTimezone: string,
  calendars?: CalendarInfo[],
  preferences?: UserPreference[],
  recentConfirmedEvents?: Array<{ id: string; summary?: string; startDateTime?: string; endDateTime?: string; calendarId?: string | null }>
) {
  const contextParts = [
    `- Current date/time: ${currentTime}`,
    `- User's timezone: ${userTimezone}`,
    `- Use this timezone for all interpretations and formatting.`,
  ];

  if (calendars && calendars.length > 0) {
    const calendarList = calendars
      .map((c) => `  - "${c.name}"${c.isPrimary ? " (primary)" : ""}: calendarId = "${c.id}"`)
      .join("\n");
    contextParts.push(`- User's available calendars:\n${calendarList}`);
    contextParts.push(`- When the user mentions a calendar by name, use the corresponding calendarId in propose_event.`);
  }

  if (preferences && preferences.length > 0) {
    const prefList = preferences
      .filter((p) => p.key !== "onboarding_completed")
      .map((p) => `  - ${p.key}: ${p.value}`)
      .join("\n");
    if (prefList) {
      contextParts.push(`- Saved preferences:\n${prefList}`);
    }
  }

  if (recentConfirmedEvents && recentConfirmedEvents.length > 0) {
    const recentList = recentConfirmedEvents
      .map((e) => `  - ${e.summary ?? "Untitled"} (${e.startDateTime ?? "start?"} → ${e.endDateTime ?? "end?"}) id=${e.id}`)
      .join("\n");
    contextParts.push(`- Recently confirmed events (latest actions):\n${recentList}`);
    contextParts.push(`- If the user says "undo" and there are no pending proposals, treat it as a request to remove the most recent confirmed event(s): use list_events if needed to verify ID, then propose_delete_event for the matching event(s).`);
  }

  return [
    CORE_INSTRUCTIONS,
    `## Context\n${contextParts.join("\n")}`,
    PREFERENCES_GUIDANCE,
  ].join("\n\n");
}

// ===== Tool Schemas =========================================================

export const calendarTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_events",
      description:
        "List calendar events within a time range. Use this to show the schedule or find event IDs before updates/deletions.",
      parameters: {
        type: "object",
        properties: {
          timeMin: {
            type: "string",
            description:
              "Start of time range in ISO 8601 format (e.g., 2024-01-15T00:00:00-05:00).",
          },
          timeMax: {
            type: "string",
            description:
              "End of time range in ISO 8601 format (e.g., 2024-01-15T23:59:59-05:00).",
          },
          calendarId: {
            type: "string",
            description: "Optional calendar ID; defaults to primary if omitted.",
          },
          query: {
            type: "string",
            description:
              "Optional free-text search query to filter events by title/description (server may ignore if unsupported).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_event",
      description:
        "Propose a new calendar event as a preview. The user must confirm before it's added to Google Calendar. ALWAYS use this instead of create_event.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Title of the event (e.g., 'Book Reading', 'Team Meeting').",
          },
          description: {
            type: "string",
            description: "Optional description or notes for the event.",
          },
          location: {
            type: "string",
            description: "Optional location of the event.",
          },
          startDateTime: {
            type: "string",
            description:
              "Start date/time in ISO 8601 format. Round to the nearest 5 minutes in the user's timezone.",
          },
          endDateTime: {
            type: "string",
            description:
              "End date/time in ISO 8601 format. Round to the nearest 5 minutes in the user's timezone.",
          },
          timeZone: {
            type: "string",
            description:
              "IANA timezone (e.g., America/New_York). Always include to avoid ambiguity.",
          },
          calendarId: {
            type: "string",
            description:
              "Optional calendar ID to add the event to. If omitted, uses the primary calendar. Use this when the user specifies a calendar like 'add to my Work calendar' or 'put this on Office Hours'.",
          },
          recurrence: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional Google Calendar RRULE strings, e.g., ['RRULE:FREQ=DAILY'] or ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260206T000000Z'].",
          },
          attendees: {
            type: "array",
            description: "Optional attendee list.",
            items: {
              type: "object",
              properties: {
                email: { type: "string" },
                displayName: { type: "string" },
                optional: { type: "boolean" },
              },
              required: ["email"],
            },
          },
          reminders: {
            type: "array",
            description:
              "Optional reminders. Each item is minutes before start with an optional delivery method (default popup).",
            items: {
              type: "object",
              properties: {
                minutesBeforeStart: { type: "number" },
                method: { type: "string", description: "email | popup" },
              },
              required: ["minutesBeforeStart"],
            },
          },
          colorId: {
            type: "string",
            description: "Optional Google Calendar colorId.",
          },
          transparency: {
            type: "string",
            description: "opaque | transparent (transparent keeps the time free).",
          },
          visibility: {
            type: "string",
            description: "default | public | private.",
          },
        },
        required: ["summary", "startDateTime", "endDateTime", "timeZone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description:
        "Update an existing calendar event. Always find the event ID with list_events first.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The ID of the event to update (from list_events).",
          },
          summary: {
            type: "string",
            description: "New title for the event.",
          },
          description: {
            type: "string",
            description: "New description for the event.",
          },
          location: {
            type: "string",
            description: "New location for the event.",
          },
          startDateTime: {
            type: "string",
            description: "New start date/time in ISO 8601 format (round to nearest 5 minutes).",
          },
          endDateTime: {
            type: "string",
            description: "New end date/time in ISO 8601 format (round to nearest 5 minutes).",
          },
          timeZone: {
            type: "string",
            description: "IANA timezone for the updated times.",
          },
          recurrence: {
            type: "array",
            items: { type: "string" },
            description: "Optional updated recurrence rules.",
          },
          attendees: {
            type: "array",
            description: "Optional attendee updates.",
            items: {
              type: "object",
              properties: {
                email: { type: "string" },
                displayName: { type: "string" },
                optional: { type: "boolean" },
              },
              required: ["email"],
            },
          },
          reminders: {
            type: "array",
            description: "Optional reminders.",
            items: {
              type: "object",
              properties: {
                minutesBeforeStart: { type: "number" },
                method: { type: "string" },
              },
              required: ["minutesBeforeStart"],
            },
          },
          colorId: {
            type: "string",
            description: "Optional Google Calendar colorId.",
          },
          transparency: {
            type: "string",
            description: "opaque | transparent (transparent keeps the time free).",
          },
          visibility: {
            type: "string",
            description: "default | public | private.",
          },
          calendarId: {
            type: "string",
            description: "Optional calendar ID if not primary.",
          },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_delete_event",
      description:
        "Propose deletion of a calendar event. User must confirm before it is deleted.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The ID of the event to delete (from list_events).",
          },
          summary: {
            type: "string",
            description: "Title/summary of the event (for display).",
          },
          startDateTime: {
            type: "string",
            description: "Start date/time of the event in ISO 8601 format.",
          },
          endDateTime: {
            type: "string",
            description: "End date/time of the event in ISO 8601 format.",
          },
          calendarId: {
            type: "string",
            description: "Optional calendar ID if not on primary.",
          },
          scope: {
            type: "string",
            description: "\"this\" deletes only this occurrence; \"all\" deletes the entire series (uses seriesEventId when provided).",
            enum: ["this", "all"],
          },
          seriesEventId: {
            type: "string",
            description: "Master recurring event ID to target when scope = \"all\".",
          },
        },
        required: ["eventId", "summary", "startDateTime", "endDateTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description:
        "Directly delete a calendar event WITHOUT confirmation. Only use if the user explicitly asks to skip confirmation.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The ID of the event to delete.",
          },
          calendarId: {
            type: "string",
            description: "Optional calendar ID if not primary.",
          },
          scope: {
            type: "string",
            description: "\"this\" deletes only this occurrence; \"all\" deletes the entire series (uses seriesEventId when provided).",
            enum: ["this", "all"],
          },
          seriesEventId: {
            type: "string",
            description: "Master recurring event ID for deleting an entire series.",
          },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_pending_events",
      description:
        "Cancel/remove all pending event proposals that are showing as previews on the calendar.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_pending_deletions",
      description:
        "Cancel/remove all pending deletion previews that are highlighted on the calendar.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_preference",
      description:
        "Save a user scheduling preference that persists across conversations. Use when the user expresses a recurring preference (not a one-time request).",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Preference key (e.g., preferred_meeting_duration, preferred_time_of_day, no_meetings_before, no_meetings_after, work_hours_start, work_hours_end).",
          },
          value: {
            type: "string",
            description:
              "Preference value (e.g., '30 minutes', 'morning', '9:00 AM', '5:00 PM').",
          },
        },
        required: ["key", "value"],
      },
    },
  },
];
