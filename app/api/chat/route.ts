import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai, calendarTools, SYSTEM_PROMPT } from "@/lib/openai";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/google-calendar";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

async function executeCalendarTool(
  name: string,
  args: Record<string, string>,
  accessToken: string
): Promise<string> {
  switch (name) {
    case "list_events": {
      const events = await listEvents(
        accessToken,
        args.timeMin,
        args.timeMax
      );
      return JSON.stringify(events);
    }
    case "create_event": {
      const event = await createEvent(accessToken, {
        summary: args.summary,
        description: args.description,
        location: args.location,
        start: {
          dateTime: args.startDateTime,
          timeZone: args.timeZone || "UTC",
        },
        end: {
          dateTime: args.endDateTime,
          timeZone: args.timeZone || "UTC",
        },
      });
      return JSON.stringify(event);
    }
    case "update_event": {
      const updates: Record<string, unknown> = {};
      if (args.summary) updates.summary = args.summary;
      if (args.description) updates.description = args.description;
      if (args.location) updates.location = args.location;
      if (args.startDateTime) {
        updates.start = {
          dateTime: args.startDateTime,
          timeZone: args.timeZone || "UTC",
        };
      }
      if (args.endDateTime) {
        updates.end = {
          dateTime: args.endDateTime,
          timeZone: args.timeZone || "UTC",
        };
      }
      const event = await updateEvent(accessToken, args.eventId, updates);
      return JSON.stringify(event);
    }
    case "delete_event": {
      const result = await deleteEvent(accessToken, args.eventId);
      return JSON.stringify(result);
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await req.json()) as {
    messages: ChatCompletionMessageParam[];
  };

  // Build conversation with system prompt
  const conversationMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  // Function-calling loop: keep calling until we get a final text response
  const maxIterations = 10;
  for (let i = 0; i < maxIterations; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationMessages,
      tools: calendarTools,
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
      });
    }

    // Execute each tool call and add results to conversation
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      const args = JSON.parse(toolCall.function.arguments);
      let result: string;

      try {
        result = await executeCalendarTool(
          toolCall.function.name,
          args,
          session.accessToken
        );
      } catch (error) {
        result = JSON.stringify({
          error: `Failed to execute ${toolCall.function.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      conversationMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return NextResponse.json({
    role: "assistant",
    content: "I'm sorry, I wasn't able to complete that request. Please try again.",
  });
}
