import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google-token-refresh";
import { listEvents, createEvent, getColors, getCalendarMetadata, listCalendars } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
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
    // Defaults for chat/tooling when no explicit range is provided:
    // look 30 days back and 180 days ahead so recurring series are fully discoverable.
    const defaultTimeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultTimeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    // Ensure we have string values (not null/undefined)
    const timeMin: string = timeMinParam !== null ? timeMinParam : defaultTimeMin;
    const timeMax: string = timeMaxParam !== null ? timeMaxParam : defaultTimeMax;

    const eventsArrays = await Promise.all(
      calendarIds.map((id: string) => {
        return listEvents(accessToken, timeMin, timeMax, id);
      })
    );
    const events = eventsArrays.flat();

    const response = NextResponse.json({
      events,
      colors: colors.event, // Event color palette
      calendarColors: colors.calendar, // Calendar color palette
      calendars,
      defaultColorId: calendarMeta.backgroundColor ? undefined : calendarMeta.colorId,
      defaultColor: calendarMeta.backgroundColor || null,
    });

    // Cache for 10 seconds on client, allow stale-while-revalidate for 30s
    response.headers.set(
      "Cache-Control",
      "private, max-age=10, stale-while-revalidate=30"
    );

    return response;
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
  calendarId?: string;
  attendees?: Array<{ email: string; displayName?: string; optional?: boolean }>;
  reminders?: Array<{ minutesBeforeStart: number; method?: string }>;
  colorId?: string;
  transparency?: "opaque" | "transparent";
  visibility?: "default" | "public" | "private";
};

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

  const body = await req.json();

  try {
    // Handle batch creation from pending events - create all in parallel for speed
    if (body.events && Array.isArray(body.events)) {
      const results = await Promise.allSettled(
        (body.events as PendingEvent[]).map((pendingEvent) =>
          createEvent(
            accessToken,
            {
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
              attendees: pendingEvent.attendees,
              reminders: pendingEvent.reminders
                ? {
                    useDefault: false,
                    overrides: pendingEvent.reminders.map((r) => ({
                      minutes: r.minutesBeforeStart,
                      method: r.method || "popup",
                    })),
                  }
                : undefined,
              colorId: pendingEvent.colorId,
              transparency: pendingEvent.transparency,
              visibility: pendingEvent.visibility,
            },
            pendingEvent.calendarId || "primary"
          ).then((event) => ({ pendingId: pendingEvent.id, event }))
        )
      );

      const createdEvents: unknown[] = [];
      const errors: { error: string }[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          createdEvents.push(result.value.event);
        } else {
          errors.push({
            error: result.reason instanceof Error ? result.reason.message : "Failed to create event",
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
