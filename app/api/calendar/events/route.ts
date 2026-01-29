import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listEvents, createEvent, getColors, getCalendarMetadata, listCalendars } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  const { searchParams } = new URL(req.url);
  const timeMinParam = searchParams.get("timeMin");
  const timeMaxParam = searchParams.get("timeMax");
  const calendarIdsParam = searchParams.get("calendarIds");

  try {
    // Fetch colors, calendar metadata, and subscribed calendars in parallel
    const [colors, calendarMeta, calendars] = await Promise.all([
      getColors(accessToken),
      getCalendarMetadata(accessToken),
      listCalendars(accessToken),
    ]);

    // Determine which calendars to fetch events from
    const calendarIds: string[] =
      calendarIdsParam?.split(",").filter(Boolean) ||
      (calendars?.map((c) => c.id).filter((id): id is string => Boolean(id)) ?? ["primary"]);

    // Compute effective time range - ensure these are definitely strings
    const defaultTimeMin = new Date().toISOString();
    const defaultTimeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Ensure we have string values (not null/undefined)
    const timeMin: string = timeMinParam !== null ? timeMinParam : defaultTimeMin;
    const timeMax: string = timeMaxParam !== null ? timeMaxParam : defaultTimeMax;

    const eventsArrays = await Promise.all(
      calendarIds.map((id: string) => {
        return listEvents(accessToken, timeMin, timeMax, id);
      })
    );
    const events = eventsArrays.flat();

    return NextResponse.json({
      events,
      colors: colors.event, // Event color palette
      calendarColors: colors.calendar, // Calendar color palette
      calendars,
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

  const accessToken = session.accessToken;
  const body = await req.json();

  try {
    // Handle batch creation from pending events
    if (body.events && Array.isArray(body.events)) {
      const createdEvents = [];
      const errors = [];

      for (const pendingEvent of body.events as PendingEvent[]) {
        try {
          const event = await createEvent(accessToken, {
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
    const event = await createEvent(accessToken, body);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
