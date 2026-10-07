import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { sessionUser } from "@/lib/sessionUser";

export const dynamic = "force-dynamic";

// Public: the events whose Best Table Contest voting is open, their brand
// tables, and (when logged in) the voter's own ballots so they can see what
// they've rated. Results are never exposed here — only in admin.
export async function GET(req: NextRequest) {
  const db = supabaseAdmin as unknown as SupabaseClient;
  const user = await sessionUser(req);

  const { data: events, error } = await db
    .from("events")
    .select("id, city, slug, date_iso")
    .eq("contest_open", true)
    .order("date_iso", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (events || []).map((e) => e.id);
  if (!ids.length) return NextResponse.json({ loggedIn: !!user, events: [] });

  const { data: entries } = await db.from("contest_entries").select("id, event_id, brand_name").in("event_id", ids).order("brand_name");
  const myVotes = user
    ? (await db.from("contest_votes").select("entry_id, taste, decoration, staff, souvenirs, overall").eq("voter_id", user.id).in("event_id", ids)).data || []
    : [];

  return NextResponse.json({
    loggedIn: !!user,
    events: (events || []).map((e) => ({
      ...e,
      entries: (entries || [])
        .filter((x) => x.event_id === e.id)
        .map((x) => ({ id: x.id, brand_name: x.brand_name, myVote: myVotes.find((v) => v.entry_id === x.id) || null })),
    })),
  });
}
