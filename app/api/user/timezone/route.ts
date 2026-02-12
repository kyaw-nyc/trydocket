import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Return user's stored timezone
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ timezone: profile?.timezone || null });
}

// POST - Update user's timezone
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { timezone } = await req.json();

  if (!timezone || typeof timezone !== "string") {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", user.id);

  if (error) {
    // If profile doesn't exist, try upsert
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, timezone }, { onConflict: "id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, timezone });
}
