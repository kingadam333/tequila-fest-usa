import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { parseScores } from "@/lib/contest";
import { sessionUser } from "@/lib/sessionUser";

// Cast or update a ballot. Login required; one ballot per account per table
// (unique entry_id+voter_id), editable only while that event's voting is open.
export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return NextResponse.json({ error: "Please log in to vote." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const entryId = typeof body?.entryId === "string" ? body.entryId : "";
  const scores = parseScores(body?.scores);
  if (!entryId || !scores) return NextResponse.json({ error: "Rate every category from 1 to 10." }, { status: 400 });

  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data: entry } = await db.from("contest_entries").select("id, event_id, events(contest_open)").eq("id", entryId).maybeSingle();
  const open = (entry?.events as { contest_open?: boolean } | null)?.contest_open;
  if (!entry || !open) return NextResponse.json({ error: "Voting isn't open for this table." }, { status: 409 });

  const now = new Date().toISOString();
  const { error } = await db
    .from("contest_votes")
    .upsert({ entry_id: entry.id, event_id: entry.event_id, voter_id: user.id, ...scores, updated_at: now }, { onConflict: "entry_id,voter_id" });
  if (error) {
    console.error("[contest] vote failed:", error.message);
    return NextResponse.json({ error: "Couldn't save your vote. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
