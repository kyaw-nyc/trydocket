import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateEvent, deleteEvent, getEvent } from "@/lib/google-calendar";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") || "primary";

  try {
    const event = await getEvent(session.accessToken, eventId, calendarId);
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
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const body = await req.json();

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

    const event = await updateEvent(session.accessToken, eventId, updates);
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
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  try {
    await deleteEvent(session.accessToken, eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete event" },
      { status: 500 }
    );
  }
}
