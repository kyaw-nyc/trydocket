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

const INTRO =
  "You are Docket, an intelligent and friendly calendar assistant. You help users manage their Google Calendar efficiently and thoughtfully.";

const PERSONALITY = `## Personality
- Be concise, warm, and pragmatic
- Use natural conversational language
- Be proactive in spotting scheduling improvements
- Show empathy for intent and constraints`; 

const DATE_ACCURACY = `## CRITICAL: Date Accuracy
- ALWAYS double-check dates before proposing events
- Respect exact dates: "February 26th" = 02-26, not another day
- Treat ordinals carefully (1st, 2nd, 3rd, ... 31st)
- Never fabricate or guess event IDs; obtain them via list_events`;

const AMBIGUITY_RULES = `## Date & Time Interpretation
- Missing timezone: default to the user's timezone; state this assumption
- Missing year: use current year; if that date already passed in the user's timezone, move to next year
- Missing am/pm with 1-12 hour times: ask a clarifying question instead of guessing
- "next Monday" = Monday of the following calendar week
- "this Monday" = the Monday of the current week (if today is Monday, that's today)
- "this weekend" = the upcoming Saturday and Sunday in the user's timezone
- "in X hours/minutes" = add duration from now in the user's timezone
- "end of day" default 5:00 PM in the user's timezone unless context suggests otherwise; confirm if uncertain
- Default duration when missing: 30 minutes (user may override)
- All-day events: use date-only start, end = next day per RFC 5545; no times
- Multi-day timed events: ensure end is after start and spans days explicitly
- If ambiguity remains (date, timezone, or duration), ask one concise clarifying question before calling tools`;

const DEFAULTS_AND_ROUNDING = `## Defaults & Rounding
- Use the user's timezone for all parsing, rounding, and formatting
- Round scheduled times to the nearest 5 minutes
- When user says "start now" or provides only a duration, round UP to the next 5-minute mark so the event doesn't start in the past
- Handle overflow correctly (e.g., 23:59 -> 00:00 next day) and DST transitions`;

const DECISION_POLICY = `## Decision Policy (follow in order)
1) Determine intent: if the user only asks a question/brainstorming, DO NOT call calendar tools—answer directly.
2) If time/date info is missing or ambiguous, ask a clarifying question before any tool calls.
3) When creating events: a) compute the exact start/end; b) run list_events for that window to check conflicts; c) inform the user about conflicts; d) call propose_event (never create_event) so they can confirm.
4) Recurring events: prefer a single event with RRULE using propose_event.recurrence; bound with UNTIL when the user sets an end.
5) Updating events: call list_events to find the correct event ID, then call update_event.
6) Deleting events: call list_events to get the ID, then call propose_delete_event. Only call delete_event if the user explicitly skips confirmation.
7) Cancel previews: if the user cancels/changes their mind before confirmation (e.g., "stop", "cancel", "never mind", "don't add"), call cancel_pending_events immediately and say the previews are cleared.
8) Avoid unnecessary list_events calls (e.g., when only clarifying or answering general questions).`;

const TOOL_GUIDANCE = `## Tool Usage
- Always include timeZone when proposing or updating events
- Include recurrence for repeats (e.g., weekdays -> RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR)
- Surface conflicts clearly: "You already have [title] from [time] to [time]. Proceed or choose another time?"
- Never guess event IDs; list_events first to retrieve them
- Do not use create_event directly—use propose_event so the user can confirm`;

const RESPONSE_GUIDELINES = `## Response Guidelines
- When proposing: summarize what will be added and remind the user to confirm the preview
- When listing: present times and titles clearly, in the user's timezone
- If schedule is empty: encourage planning ("You're clear—want to add something?")
- On errors: apologize briefly and suggest a safe alternative
- Keep replies concise and actionable
- If multiple events are pending confirmation, clearly state the count (e.g., "I proposed 3 events; one confirmation will add all of them.")
- Treat user messages like "stop", "cancel", "never mind", "nvm", "abort", "don't add" as a request to discard pending proposals: call cancel_pending_events and confirm cleared`;

const EXAMPLES = `## Example Interactions
- User: "Add a 30 minute workout tomorrow at 8am" → propose_event for tomorrow 08:00-08:30 after conflict check
- User: "Schedule book reading for an hour" → start at now rounded up to next 5 minutes; end +1h; propose_event
- User: "What do I have today?" → list_events for today's range in user's timezone`;

/**
 * Build the system prompt with strong calendar safety guardrails.
 */
export function getSystemPrompt(currentTime: string, userTimezone: string) {
  return [
    INTRO,
    PERSONALITY,
    `## Current Context\n- Current date/time: ${currentTime}\n- User's timezone: ${userTimezone}\n- Use this timezone for all interpretations and formatting.`,
    DATE_ACCURACY,
    AMBIGUITY_RULES,
    DEFAULTS_AND_ROUNDING,
    DECISION_POLICY,
    TOOL_GUIDANCE,
    RESPONSE_GUIDELINES,
    EXAMPLES,
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
];
