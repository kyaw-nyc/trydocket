import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateEvent, deleteEvent } from "@/lib/google-calendar";

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
