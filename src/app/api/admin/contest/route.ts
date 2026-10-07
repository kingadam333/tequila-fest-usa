import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { computeResults, winnerOf, OHIO_CITIES, type Scores } from "@/lib/contest";
import { fetchAllRows } from "@/lib/fetchAllRows";

const db = () => supabaseAdmin as unknown as SupabaseClient;

// Admin -> Contest: every event from the last 6 months onward, with its brand
// tables, live results (average score, per-category averages, vote counts,
// eligibility) and the city winner.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const since = new Date(Date.now() - 183 * 86400000).toISOString();
  const { data: events, error } = await db()
    .from("events")
    .select("id, city, slug, date_iso, status, contest_open")
    .gte("date_iso", since)
    .neq("status", "draft")
    .order("date_iso", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (events || []).map((e) => e.id);

  const { data: entries } = ids.length
    ? await db().from("contest_entries").select("id, event_id, brand_name").in("event_id", ids).order("brand_name")
    : { data: [] };
  // Votes can pass PostgREST's 1000-row cap at a busy event, so page through them.
  const votes = ids.length
    ? await fetchAllRows<{ entry_id: string; event_id: string; voter_id: string } & Scores>((from, to) =>
        db().from("contest_votes").select("entry_id, event_id, voter_id, taste, decoration, staff, souvenirs, overall").in("event_id", ids).range(from, to),
      )
    : [];

  const out = (events || []).map((e) => {
    const results = computeResults((entries || []).filter((x) => x.event_id === e.id), votes.filter((v) => v.event_id === e.id));
    return { ...e, results, winner: winnerOf(results), voters: new Set(votes.filter((v) => v.event_id === e.id).map((v) => v.voter_id)).size };
  });

  // Ohio champion: best of the Ohio city winners, per year.
  const ohioByYear: Record<string, { city: string; brand: string; score: number | null; votes: number } | null> = {};
  for (const e of out) {
    if (!OHIO_CITIES.includes(String(e.city).toLowerCase()) || !e.winner) continue;
    const year = String(new Date(e.date_iso).getUTCFullYear());
    const cur = ohioByYear[year];
    const cand = { city: e.city, brand: e.winner.brand, score: e.winner.score, votes: e.winner.votes };
    if (!cur || (cand.score ?? 0) > (cur.score ?? 0) || ((cand.score ?? 0) === (cur.score ?? 0) && cand.votes > cur.votes)) ohioByYear[year] = cand;
  }

  return NextResponse.json({ events: out, ohioByYear });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";

  if (action === "set_open") {
    const { error } = await db().from("events").update({ contest_open: Boolean(body?.open) }).eq("id", eventId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add_entry") {
    const brand = typeof body?.brand === "string" ? body.brand.trim().slice(0, 120) : "";
    if (!eventId || !brand) return NextResponse.json({ error: "Brand name required" }, { status: 400 });
    const { error } = await db().from("contest_entries").insert({ event_id: eventId, brand_name: brand });
    if (error) return NextResponse.json({ error: error.code === "23505" ? "That brand is already in this event" : error.message }, { status: error.code === "23505" ? 409 : 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove_entry") {
    const entryId = typeof body?.entryId === "string" ? body.entryId : "";
    const { error } = await db().from("contest_entries").delete().eq("id", entryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Adds every brand with a PAID brand package covering this event's city,
  // bought within the year before the event. Skips brands already listed.
  if (action === "import_paid") {
    const { data: ev } = await db().from("events").select("city, date_iso").eq("id", eventId).maybeSingle();
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    const city = String(ev.city).toLowerCase();
    const eventAt = new Date(ev.date_iso).getTime();
    const { data: orders, error } = await db().from("brand_package_orders").select("brand_name, cities, paid_at").eq("status", "paid");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const wanted = [
      ...new Set(
        (orders || [])
          .filter((o) => Array.isArray(o.cities) && o.cities.includes(city))
          .filter((o) => !o.paid_at || (new Date(o.paid_at).getTime() <= eventAt && new Date(o.paid_at).getTime() > eventAt - 366 * 86400000))
          .map((o) => String(o.brand_name || "").trim())
          .filter(Boolean),
      ),
    ];
    const { data: existing } = await db().from("contest_entries").select("brand_name").eq("event_id", eventId);
    const have = new Set((existing || []).map((x) => x.brand_name.toLowerCase()));
    const toAdd = wanted.filter((b) => !have.has(b.toLowerCase()));
    if (toAdd.length) {
      const { error: insErr } = await db().from("contest_entries").insert(toAdd.map((brand_name) => ({ event_id: eventId, brand_name })));
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, added: toAdd.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
