import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google-token-refresh";
import {
  openai,
  calendarTools,
  getSystemPrompt,
  roundToNearest5Minutes,
} from "@/lib/openai";
import { listEvents, updateEvent, deleteEvent } from "@/lib/google-calendar";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ZodError } from "zod";
import {
  CalendarToolArgs,
  validateToolArgs,
} from "@/lib/tool-validation";
import { selectColorId } from "@/lib/color-chooser";

// Get user's likely timezone from their location or default to a sensible one
function getUserTimezone(): string {
  // In a real app, you'd get this from user preferences or browser
  // For now, we'll use a common US timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
}

type PendingEventData = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  recurrence?: string[];
  attendees?: Array<{ email: string; displayName?: string; optional?: boolean }>;
  reminders?: Array<{ minutesBeforeStart: number; method?: string }>;
  colorId?: string;
  transparency?: string;
  visibility?: string;
};

type PendingDeletionData = {
  eventId: string;
  calendarId?: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
};

async function executeCalendarTool(
  name: string,
  // tool args vary per tool; keep flexible and validate per-case
  args: CalendarToolArgs,
  accessToken: string,
  userTimeZone: string
): Promise<{ result: string; pendingEvent?: PendingEventData; pendingDeletion?: PendingDeletionData; clearPendingEvents?: boolean; clearPendingDeletions?: boolean }> {
  switch (name) {
    case "list_events": {
      const events = await listEvents(
        accessToken,
        args.timeMin,
        args.timeMax,
        args.calendarId,
        args.query
      );
      // Format events nicely for the AI
      const formattedEvents = events.map((event) => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
      }));
      return { result: JSON.stringify(formattedEvents) };
    }
    case "propose_event": {
      // Round times to nearest 5 minutes for cleaner scheduling
      const tz = args.timeZone || userTimeZone;
      const startDateTime = roundToNearest5Minutes(args.startDateTime!, tz);
      const endDateTime = roundToNearest5Minutes(args.endDateTime!, tz);

      // Check for conflicts with existing events
      let conflicts: Array<{ summary?: string; start?: string; end?: string }> = [];
      try {
        const existingEvents = await listEvents(
          accessToken,
          startDateTime,
          endDateTime,
          args.calendarId,
          args.query
        );

        // Filter for overlapping events
        const startMs = new Date(startDateTime).getTime();
        const endMs = new Date(endDateTime).getTime();

        conflicts = existingEvents
          .filter((event) => {
            const eventStart = event.start?.dateTime || event.start?.date;
            const eventEnd = event.end?.dateTime || event.end?.date;
            if (!eventStart) return false;

            const eventStartMs = new Date(eventStart).getTime();
            const eventEndMs = eventEnd ? new Date(eventEnd).getTime() : eventStartMs + 60 * 60 * 1000; // default 1 hour

            // Check for overlap: events overlap if one starts before the other ends
            return !(endMs <= eventStartMs || startMs >= eventEndMs);
          })
          .map((event) => ({
            summary: event.summary ?? undefined,
            start: event.start?.dateTime ?? event.start?.date ?? undefined,
            end: event.end?.dateTime ?? event.end?.date ?? undefined,
          }));
      } catch (error) {
        // If conflict check fails, proceed anyway but log it
        console.error("Failed to check for conflicts:", error);
      }

      const pendingEvent: PendingEventData = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        summary: args.summary!,
        description: args.description,
        location: args.location,
        startDateTime,
        endDateTime,
        timeZone: tz,
        recurrence: Array.isArray(args.recurrence) ? args.recurrence : undefined,
      };

      return {
        result: JSON.stringify({
          success: true,
          message: conflicts.length > 0
            ? `Event "${args.summary}" has been proposed, but there ${conflicts.length === 1 ? 'is' : 'are'} ${conflicts.length} conflicting event${conflicts.length > 1 ? 's' : ''} during this time. Please inform the user about the conflict(s).`
            : `Event "${args.summary}" has been proposed and is now showing as a preview on the calendar. The user needs to click "Confirm" to add it to Google Calendar.`,
          event: {
            summary: pendingEvent.summary,
            start: pendingEvent.startDateTime,
            end: pendingEvent.endDateTime,
            recurrence: pendingEvent.recurrence,
          },
          conflicts: conflicts.length > 0 ? conflicts : undefined,
        }),
        pendingEvent,
      };
    }
    case "update_event": {
      if (!args.eventId) {
        throw new Error("eventId is required for update_event");
      }
      const updates: Record<string, unknown> = {};
      if (args.summary) updates.summary = args.summary;
      if (args.description) updates.description = args.description;
      if (args.location) updates.location = args.location;
      if (args.startDateTime) {
        updates.start = {
          dateTime: roundToNearest5Minutes(
            args.startDateTime,
            args.timeZone || userTimeZone
          ),
          timeZone: args.timeZone || userTimeZone,
        };
      }
      if (args.endDateTime) {
        updates.end = {
          dateTime: roundToNearest5Minutes(
            args.endDateTime,
            args.timeZone || userTimeZone
          ),
          timeZone: args.timeZone || userTimeZone,
        };
      }
      const event = await updateEvent(accessToken, args.eventId, updates);
      return { result: JSON.stringify(event) };
    }
    case "propose_delete_event": {
      if (!args.eventId) {
        throw new Error("eventId is required for propose_delete_event");
      }
      if (!args.summary || !args.startDateTime || !args.endDateTime) {
        throw new Error("summary, startDateTime, and endDateTime are required for propose_delete_event");
      }

      const pendingDeletion: PendingDeletionData = {
        eventId: args.eventId,
        calendarId: args.calendarId,
        summary: args.summary,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
      };

      return {
        result: JSON.stringify({
          success: true,
          message: `Event "${args.summary}" has been marked for deletion and is now highlighted on the calendar. The user needs to click "Confirm Delete" to remove it from Google Calendar.`,
        }),
        pendingDeletion,
      };
    }
    case "delete_event": {
      if (!args.eventId) {
        throw new Error("eventId is required for delete_event");
      }
      const result = await deleteEvent(accessToken, args.eventId);
      return { result: JSON.stringify(result) };
    }
    case "cancel_pending_events": {
      return {
        result: JSON.stringify({
          success: true,
          message: "All pending event proposals have been cancelled and removed from the calendar preview.",
        }),
        clearPendingEvents: true,
      };
    }
    case "cancel_pending_deletions": {
      return {
        result: JSON.stringify({
          success: true,
          message: "All pending deletion previews have been cancelled and removed from the calendar.",
        }),
        clearPendingDeletions: true,
      };
    }
    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidGoogleToken(supabase, user.id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get Google token" },
      { status: 401 }
    );
  }

  const body = (await req.json()) as {
    messages: ChatCompletionMessageParam[];
    timezone?: string;
    hasPendingEvents?: boolean;
    pendingEventSummaries?: string[];
    hasPendingDeletions?: boolean;
    pendingDeletionSummaries?: string[];
  };

  const {
    messages,
    timezone,
    hasPendingEvents,
    pendingEventSummaries,
    hasPendingDeletions,
    pendingDeletionSummaries,
  } = body;

  // Get current time formatted nicely
  const now = new Date();
  const currentTime = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const userTimezone = timezone || getUserTimezone();

  // Build pending events context for the AI - THIS IS CRITICAL FOR CORRECT BEHAVIOR
  let pendingEventsContext = "";
  if (hasPendingEvents && pendingEventSummaries && pendingEventSummaries.length > 0) {
    pendingEventsContext = `\n\n## CRITICAL: Current Calendar State
**PENDING PROPOSALS (not yet confirmed):**
${pendingEventSummaries.map(s => `- "${s}"`).join("\n")}

These events are still proposals. Use cancel_pending_events to remove them.`;
  } else {
    pendingEventsContext = `\n\n## CRITICAL: Current Calendar State
**There are ZERO pending proposals on the calendar.**

IMPORTANT: Even if the conversation history shows you proposed events earlier, those proposals have been CONFIRMED by the user and are now REAL calendar events. The user clicked "Confirm" so they are no longer proposals.

- DO NOT use cancel_pending_events (there's nothing to cancel)
- To delete events that were previously proposed and confirmed, you MUST:
  1. First use list_events to find the event ID
  2. Then use propose_delete_event with that event ID

This is the CURRENT state - trust this over conversation history.`;
  }

  let pendingDeletionsContext = "";
  if (hasPendingDeletions && pendingDeletionSummaries && pendingDeletionSummaries.length > 0) {
    pendingDeletionsContext = `\n\n**PENDING DELETIONS (awaiting confirmation):**
${pendingDeletionSummaries.map(s => `- "${s}"`).join("\n")}

These deletions are previews. Use cancel_pending_deletions to remove the deletion highlights.`;
  } else {
    pendingDeletionsContext = `\n\n**There are ZERO pending deletions on the calendar.**`;
  }

  // Build conversation with dynamic system prompt
  const conversationMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: getSystemPrompt(currentTime, userTimezone) + pendingEventsContext + pendingDeletionsContext },
    ...messages,
  ];

  const pendingEvents: PendingEventData[] = [];
  const pendingDeletions: PendingDeletionData[] = [];
  let shouldClearPendingEvents = false;
  let shouldClearPendingDeletions = false;

  // Function-calling loop: keep calling until we get a final text response
  const maxIterations = 10;
  for (let i = 0; i < maxIterations; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationMessages,
      tools: calendarTools,
      temperature: 0.2, // Low temperature for precise date/time handling
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Add assistant message to conversation
    conversationMessages.push(message);

    // If no tool calls, we're done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return NextResponse.json({
        role: "assistant",
        content: message.content,
        pendingEvents: pendingEvents.length > 0 ? pendingEvents : undefined,
        pendingDeletions: pendingDeletions.length > 0 ? pendingDeletions : undefined,
        clearPendingEvents: shouldClearPendingEvents || undefined,
        clearPendingDeletions: shouldClearPendingDeletions || undefined,
      });
    }

    // Execute each tool call and add results to conversation
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      const rawArgs = JSON.parse(toolCall.function.arguments);
      let toolResult: { result: string; pendingEvent?: PendingEventData; pendingDeletion?: PendingDeletionData; clearPendingEvents?: boolean; clearPendingDeletions?: boolean };

      try {
        const args = validateToolArgs(toolCall.function.name, rawArgs);

        toolResult = await executeCalendarTool(
          toolCall.function.name,
          args,
          accessToken,
          userTimezone
        );

        // Collect pending events
        if (toolResult.pendingEvent) {
          const colorId = selectColorId(
            pendingEvents.map((e) => ({
              startDateTime: e.startDateTime,
              endDateTime: e.endDateTime,
              colorId: e.colorId,
            })),
            toolResult.pendingEvent.startDateTime
          );

          pendingEvents.push({
            ...toolResult.pendingEvent,
            colorId,
          });
        }

        // Collect pending deletions
        if (toolResult.pendingDeletion) {
          pendingDeletions.push(toolResult.pendingDeletion);
        }

        // Track if we should clear pending events
        if (toolResult.clearPendingEvents) {
          shouldClearPendingEvents = true;
        }
        if (toolResult.clearPendingDeletions) {
          shouldClearPendingDeletions = true;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          toolResult = {
            result: JSON.stringify({
              error: `Invalid arguments for ${toolCall.function.name}`,
              issues: error.issues,
            }),
          };
        } else {
          toolResult = {
            result: JSON.stringify({
              error: `Failed to execute ${toolCall.function.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
            }),
          };
        }
      }

      conversationMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult.result,
      });
    }
  }

  return NextResponse.json({
    role: "assistant",
    content: "I'm sorry, I wasn't able to complete that request. Please try again.",
    pendingEvents: pendingEvents.length > 0 ? pendingEvents : undefined,
    pendingDeletions: pendingDeletions.length > 0 ? pendingDeletions : undefined,
    clearPendingEvents: shouldClearPendingEvents || undefined,
    clearPendingDeletions: shouldClearPendingDeletions || undefined,
  });
}
