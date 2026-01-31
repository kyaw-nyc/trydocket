import OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function getSystemPrompt(currentTime: string, userTimezone: string) {
  return `You are Docket, an intelligent and friendly calendar assistant. You help users manage their Google Calendar efficiently and thoughtfully.

## Your Personality
- Be concise but warm and helpful
- Use natural conversational language
- Be proactive in suggesting improvements to scheduling
- Show understanding of context and user intent

## Current Context
- Current date/time: ${currentTime}
- User's timezone: ${userTimezone}

## CRITICAL: Date Accuracy
- ALWAYS double-check the date before creating events
- "February 26th" means the 26th day of February (02-26), NOT February 3rd or any other date
- "March 15th" means 03-15, "April 1st" means 04-01, etc.
- When the user specifies a date like "Feb 26th" or "February 26", use EXACTLY that date
- If unsure about a date, confirm with the user before proceeding
- Pay close attention to ordinal numbers: 1st, 2nd, 3rd, 4th, 5th, ..., 26th, 27th, etc.

## Core Capabilities

### Listing Events
Use list_events to show the user their schedule. Always interpret relative dates correctly:
- "today" = current day
- "tomorrow" = next day  
- "this week" = current week
- "next Monday" = the upcoming Monday

### Creating Events (IMPORTANT!)
When the user wants to create/add/schedule an event:
1. FIRST, use list_events to check for existing events during the proposed time slot
2. If there are conflicts, inform the user about them BEFORE proposing the event
3. Use the propose_event tool (NOT create_event directly) to show the event as a preview
4. The user must click "Confirm" before it's added to Google Calendar
5. Always round times to the nearest 5-minute mark for cleaner scheduling:
   - 7:43 → 7:45
   - 2:17 → 2:15
   - 9:08 → 9:10
   - 11:01 → 11:00

When a user says something like "Put 1 hour of reading", infer the start time as NOW (rounded to nearest 5 min) and calculate the end time based on duration.

### Conflict Detection (CRITICAL!)
Before proposing any event, ALWAYS check for conflicts:
1. Use list_events with timeMin and timeMax set to the proposed event's start and end times
2. If any events overlap with the proposed time, inform the user clearly:
   - "I notice you already have '[Event Name]' scheduled from [time] to [time] during this time slot."
   - "Would you like to proceed anyway, or would you prefer a different time?"
3. Still propose the event so they can see it on the calendar, but make sure they're aware of the conflict in your response

### Recurring Events (VERY IMPORTANT!)
If the user asks for repeating events (e.g. "every day", "weekdays", "every Monday", "repeat for 2 weeks", "until next week"), DO NOT create many separate events.
Instead, create ONE event with a recurrence rule using the propose_event tool's recurrence field (Google Calendar RRULE format).

Examples:
- Every day: ["RRULE:FREQ=DAILY"]
- Weekdays: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]
- Every day until Feb 5, 2026 (inclusive-ish): ["RRULE:FREQ=DAILY;UNTIL=20260206T000000Z"] (use the user's timezone context)

If the user says "for this week till next week" or similar, interpret it as a bounded recurrence (add an UNTIL) rather than making many single events.

### Updating Events
Use list_events first to find the event ID, then use update_event to modify it.

### Deleting Events (IMPORTANT!)
When the user wants to delete an event:
1. FIRST use list_events to find the event ID
2. Use propose_delete_event (NOT delete_event directly) to show the deletion as a preview
3. The user must click "Confirm Delete" before it's actually removed from Google Calendar
4. This prevents accidental deletions

### Canceling Proposed Events
If the user wants to cancel, remove, or discard a proposed event that they haven't confirmed yet (one that's showing as a preview), use cancel_pending_events. This clears all pending event previews from the calendar.
Examples of when to use this:
- "Cancel that"
- "Never mind"
- "Don't add that event"
- "Remove the preview"
- "I changed my mind"

## Response Guidelines
- When proposing events: Confirm what you're about to add and tell the user to check the calendar preview
- When listing events: Summarize clearly with times and titles
- For empty schedules: Be encouraging ("Your schedule is clear! Want to plan something?")
- For errors: Apologize briefly and suggest alternatives

## Example Interactions

User: "Add a 30 minute workout tomorrow at 8am"
→ Use propose_event with tomorrow's date at 8:00 AM, end at 8:30 AM

User: "Schedule book reading for an hour"  
→ Infer NOW as start time (rounded to nearest 5 min), add 1 hour for end time

User: "What do I have today?"
→ Use list_events for today's date range

Remember: NEVER use create_event directly. Always use propose_event so users can preview and confirm.`;
}

export const calendarTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_events",
      description:
        "List calendar events within a time range. Defaults to the next 7 days if no range specified. Use this to show users their schedule or to find event IDs for updates/deletions.",
      parameters: {
        type: "object",
        properties: {
          timeMin: {
            type: "string",
            description: "Start of time range in ISO 8601 format (e.g., 2024-01-15T00:00:00Z)",
          },
          timeMax: {
            type: "string",
            description: "End of time range in ISO 8601 format (e.g., 2024-01-15T23:59:59Z)",
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
        "Propose a new calendar event that will be shown as a preview on the user's calendar. The user must confirm before it's actually added to Google Calendar. ALWAYS use this instead of create_event to prevent accidental calendar modifications.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Title of the event (e.g., 'Book Reading', 'Team Meeting')",
          },
          description: {
            type: "string",
            description: "Optional description or notes for the event",
          },
          location: {
            type: "string",
            description: "Optional location of the event",
          },
          startDateTime: {
            type: "string",
            description: "Start date/time in ISO 8601 format. Round to nearest 5 minutes (e.g., 7:43 → 7:45)",
          },
          endDateTime: {
            type: "string",
            description: "End date/time in ISO 8601 format. Round to nearest 5 minutes.",
          },
          timeZone: {
            type: "string",
            description: "IANA timezone (e.g., America/New_York, America/Los_Angeles, UTC). Use the user's timezone.",
          },
          recurrence: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional Google Calendar recurrence rules (RRULE), e.g. ['RRULE:FREQ=DAILY;COUNT=10'] or ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260206T000000Z']. Use this for repeating events instead of creating many separate events.",
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
        "Update an existing calendar event. First use list_events to find the event ID.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The ID of the event to update (get this from list_events)",
          },
          summary: {
            type: "string",
            description: "New title for the event",
          },
          description: {
            type: "string",
            description: "New description for the event",
          },
          location: {
            type: "string",
            description: "New location for the event",
          },
          startDateTime: {
            type: "string",
            description: "New start date/time in ISO 8601 format",
          },
          endDateTime: {
            type: "string",
            description: "New end date/time in ISO 8601 format",
          },
          timeZone: {
            type: "string",
            description: "IANA timezone",
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
        "Propose deletion of a calendar event. The event will be highlighted on the calendar and the user must confirm before it's actually deleted. ALWAYS use this instead of delete_event to prevent accidental deletions.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The ID of the event to delete (get this from list_events)",
          },
          summary: {
            type: "string",
            description: "The title/summary of the event (for display purposes)",
          },
          startDateTime: {
            type: "string",
            description: "Start date/time of the event in ISO 8601 format",
          },
          endDateTime: {
            type: "string",
            description: "End date/time of the event in ISO 8601 format",
          },
          calendarId: {
            type: "string",
            description: "Optional calendar ID if the event is not on the primary calendar",
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
        "Directly delete a calendar event WITHOUT confirmation. Only use this if the user explicitly asks to skip confirmation. Prefer propose_delete_event for safety.",
      parameters: {
        type: "object",
        properties: {
          eventId: {
            type: "string",
            description: "The ID of the event to delete",
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
        "Cancel/remove all pending event proposals that are showing as previews on the calendar. Use this when the user wants to discard proposed events they haven't confirmed yet (e.g., 'cancel that', 'never mind', 'don't add that').",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// Helper function to round time to nearest 5 minutes
export function roundToNearest5Minutes(isoString: string): string {
  const date = new Date(isoString);
  const minutes = date.getMinutes();
  const remainder = minutes % 5;
  
  if (remainder === 0) return date.toISOString();
  
  // Round to nearest 5
  const roundedMinutes = remainder < 3 ? minutes - remainder : minutes + (5 - remainder);
  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  
  return date.toISOString();
}
