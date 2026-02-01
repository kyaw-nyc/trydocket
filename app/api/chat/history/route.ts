import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Load current chat session and messages
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the most recent chat session for this user
  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (sessionError && sessionError.code !== "PGRST116") {
    // PGRST116 = no rows returned, which is fine for new users
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    // No session yet - return empty
    return NextResponse.json({ messages: [], sessionId: null });
  }

  // Get messages for this session
  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: session.id,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });
}

// POST - Save new messages to the session
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, messages } = body as {
    sessionId?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages to save" }, { status: 400 });
  }

  let currentSessionId = sessionId;

  // Create a new session if we don't have one
  if (!currentSessionId) {
    const { data: newSession, error: createError } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    currentSessionId = newSession.id;
  }

  // Insert the new messages
  const messagesToInsert = messages.map((m) => ({
    session_id: currentSessionId,
    role: m.role,
    content: m.content,
  }));

  const { error: insertError } = await supabase
    .from("chat_messages")
    .insert(messagesToInsert);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update session's updated_at timestamp
  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", currentSessionId);

  return NextResponse.json({ success: true, sessionId: currentSessionId });
}

// DELETE - Clear chat history (start fresh)
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all chat sessions for this user (messages will cascade delete)
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
