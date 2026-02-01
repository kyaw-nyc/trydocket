import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google-token-refresh";
import { updateEvent, deleteEvent, getEvent } from "@/lib/google-calendar";

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
