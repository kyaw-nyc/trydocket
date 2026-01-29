import OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const SYSTEM_PROMPT = `You are a helpful calendar assistant. You help users manage their Google Calendar by creating, updating, deleting, and listing events.

When the user asks to schedule or create an event, use the create_event tool. When they ask to see their schedule, use the list_events tool. When they want to modify an event, use update_event. When they want to cancel/remove an event, use delete_event.

Always confirm what you did after performing an action. Use natural, friendly language.

The current date and time is: ${new Date().toISOString()}. Use this to interpret relative dates like "tomorrow", "next Monday", etc.

When creating events, if the user doesn't specify a timezone, default to the user's likely timezone based on context, or use UTC.`;

export const calendarTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_events",
      description:
        "List upcoming calendar events within a time range. Defaults to the next 7 days if no range specified.",
      parameters: {
        type: "object",
        properties: {
          timeMin: {
            type: "string",
            description: "Start of time range in ISO 8601 format",
          },
          timeMax: {
            type: "string",
            description: "End of time range in ISO 8601 format",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Create a new calendar event",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Title of the event",
          },
          description: {
            type: "string",
            description: "Description of the event",
          },
          location: {
            type: "string",
            description: "Location of the event",
          },
          startDateTime: {
            type: "string",
            description: "Start date/time in ISO 8601 format",
          },
          endDateTime: {
            type: "string",
            description: "End date/time in ISO 8601 format",
          },
          timeZone: {
            type: "string",
            description:
              "IANA timezone (e.g. America/New_York). Defaults to UTC.",
          },
        },
        required: ["summary", "startDateTime", "endDateTime"],
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
            description: "The ID of the event to update",
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
