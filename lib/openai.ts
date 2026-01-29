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

### Deleting Events
Use list_events first to find the event ID, then use delete_event to remove it.

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
      name: "delete_event",
      description:
        "Delete a calendar event. First use list_events to find the event ID.",
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
