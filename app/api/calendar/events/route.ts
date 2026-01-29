import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listEvents, createEvent, getColors, getCalendarMetadata } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin") || undefined;
  const timeMax = searchParams.get("timeMax") || undefined;

  try {
    // Fetch events, colors, and calendar metadata in parallel
    const [events, colors, calendarMeta] = await Promise.all([
      listEvents(session.accessToken, timeMin, timeMax),
      getColors(session.accessToken),
      getCalendarMetadata(session.accessToken),
    ]);

    return NextResponse.json({
      events,
      colors: colors.event, // Event color palette
      calendarColors: colors.calendar, // Calendar color palette
      defaultColorId: calendarMeta.backgroundColor ? undefined : calendarMeta.colorId,
      defaultColor: calendarMeta.backgroundColor || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list events" },
      { status: 500 }
    );
  }
}

type PendingEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  recurrence?: string[];
};

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  try {
    // Handle batch creation from pending events
    if (body.events && Array.isArray(body.events)) {
      const createdEvents = [];
      const errors = [];

      for (const pendingEvent of body.events as PendingEvent[]) {
        try {
          const event = await createEvent(session.accessToken, {
            summary: pendingEvent.summary,
            description: pendingEvent.description,
            location: pendingEvent.location,
            start: {
              dateTime: pendingEvent.startDateTime,
              timeZone: pendingEvent.timeZone,
            },
            end: {
              dateTime: pendingEvent.endDateTime,
              timeZone: pendingEvent.timeZone,
            },
            recurrence: pendingEvent.recurrence,
          });
          createdEvents.push(event);
        } catch (err) {
          errors.push({
            pendingId: pendingEvent.id,
            error: err instanceof Error ? err.message : "Failed to create event",
          });
        }
      }

      return NextResponse.json({
        events: createdEvents,
        errors: errors.length > 0 ? errors : undefined,
        success: errors.length === 0,
      });
    }

    // Handle single event creation (legacy)
    const event = await createEvent(session.accessToken, body);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
