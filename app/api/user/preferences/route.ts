import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type UserPreference = {
  key: string;
  value: string;
};

// GET - Load all user preferences
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("key, value")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: preferences || [] });
}

// POST - Save or update preferences
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { preferences } = body as { preferences: UserPreference[] };

  if (!preferences || !Array.isArray(preferences)) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  // Upsert each preference
  for (const pref of preferences) {
    if (!pref.key || typeof pref.value !== "string") continue;

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          key: pref.key,
          value: pref.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" }
      );

    if (error) {
      console.error("Failed to save preference:", error);
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE - Remove a specific preference or all preferences
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key) {
    // Delete specific preference
    const { error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("key", key);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Delete all preferences
    const { error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
