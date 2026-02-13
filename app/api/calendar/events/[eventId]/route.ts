import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google-token-refresh";
import { updateEvent, deleteEvent, getEvent, createEvent, updateEventRecurrence } from "@/lib/google-calendar";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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

  const { eventId } = await params;
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") || "primary";

  try {
    const event = await getEvent(accessToken, eventId, calendarId);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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

  const { eventId } = await params;
  const body = await req.json();
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") || "primary";

  try {
    const scope: string | undefined = body.scope;
    const recurringEventId: string | undefined = body.recurringEventId;

    // "following" scope: truncate old series + create new recurring event
    if (scope === "following" && recurringEventId && body.startDateTime && body.endDateTime) {
      // 1. Get the master event to read its recurrence rule
      const masterEvent = await getEvent(accessToken, recurringEventId, calendarId);
      const recurrenceRules: string[] = masterEvent.recurrence || [];

      // 2. Calculate UNTIL date: just before this instance's original start
      //    We use the instance's original start from the eventId (format: baseId_YYYYMMDDTHHMMSSZ)
      const instanceDateMatch = eventId.match(/_(\d{8}T\d{6}Z)$/);
      let untilStr: string;
      if (instanceDateMatch) {
        // Use the instance date from the ID
        untilStr = instanceDateMatch[1];
      } else {
        // Fallback: use the new start minus 1 second
        const d = new Date(new Date(body.startDateTime).getTime() - 1000);
        untilStr = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      }

      // 3. Patch the master event's RRULE to add UNTIL clause
      const updatedRules = recurrenceRules.map((rule: string) => {
        if (!rule.startsWith("RRULE:")) return rule;
        // Remove existing UNTIL or COUNT
        let cleaned = rule.replace(/;UNTIL=[^;]*/i, "").replace(/;COUNT=\d+/i, "");
        cleaned += `;UNTIL=${untilStr}`;
        return cleaned;
      });
      await updateEventRecurrence(accessToken, recurringEventId, updatedRules, calendarId);

      // 4. Create a new recurring event with the modified times and same frequency
      const newRecurrence = recurrenceRules.map((rule: string) => {
        if (!rule.startsWith("RRULE:")) return rule;
        // Remove UNTIL/COUNT from the new series so it continues indefinitely
        return rule.replace(/;UNTIL=[^;]*/i, "").replace(/;COUNT=\d+/i, "");
      });

      const newEvent = await createEvent(
        accessToken,
        {
          summary: masterEvent.summary || "Untitled",
          description: masterEvent.description || undefined,
          location: masterEvent.location || undefined,
          start: { dateTime: body.startDateTime, timeZone: body.timeZone || "UTC" },
          end: { dateTime: body.endDateTime, timeZone: body.timeZone || "UTC" },
          recurrence: newRecurrence,
        },
        calendarId
      );

      return NextResponse.json({ event: newEvent });
    }

    // "this" or "all" scope (or no scope): standard PATCH
    const updates: Record<string, unknown> = {};
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.colorId !== undefined) updates.colorId = body.colorId;
    if (body.description !== undefined) updates.description = body.description;
    if (body.location !== undefined) updates.location = body.location;
    if (body.startDateTime) {
      updates.start = {
        dateTime: body.startDateTime,
        timeZone: body.timeZone || "UTC",
      };
    }
    if (body.endDateTime) {
      updates.end = {
        dateTime: body.endDateTime,
        timeZone: body.timeZone || "UTC",
      };
    }

    const event = await updateEvent(accessToken, eventId, updates, calendarId);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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

  const { eventId } = await params;
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") || "primary";

  try {
    await deleteEvent(accessToken, eventId, calendarId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete event" },
      { status: 500 }
    );
  }
}
