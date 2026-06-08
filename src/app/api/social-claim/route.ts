import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { platform, postUrl, eventId } = await req.json();

  if (!platform || !postUrl || !eventId) {
    return NextResponse.json({ error: "platform, postUrl, and eventId are required" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const db = supabaseAdmin as any;

  // Check for duplicate claim on same post URL
  const { data: existing } = await db
    .from("social_share_claims")
    .select("id, status")
    .eq("post_url", postUrl)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This post has already been submitted for review." }, { status: 400 });
  }

  const record: any = {
    platform,
    post_url: postUrl,
    event_id: eventId,
    points_awarded: 0, // set to 75 by admin on approval
    status: "pending",
  };
  if (user) {
    record.customer_id = user.id;
    record.customer_email = user.email;
  }

  await db.from("social_share_claims").insert(record);

  return NextResponse.json({ success: true, pending: true });
}
