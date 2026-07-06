import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType } from "@/lib/normalizeTicketType";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  // Fetch events + ticket_types
  const { data: events, error } = await db
    .from("events")
    .select(`*, ticket_types(*)`)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count from ticket_instances (one row per ticket — the real source of truth).
  // Counted by event_id, NOT event_slug — a city's slug gets reassigned to
  // the next year's event when the old one is marked completed (permanent
  // city URL strategy), so slug-based counting would misattribute every past
  // year's sales to whichever event currently holds that slug. event_id is
  // set at purchase time and never changes.
  const { data: instances } = await db
    .from("ticket_instances")
    .select("ticket_type, event_id");

  // Build lookup: "eventId:normalizedType" → count
  const countMap = new Map<string, number>();
  for (const ti of instances || []) {
    if (!ti.event_id) continue;
    const key = `${ti.event_id}:${normalizeTicketType(ti.ticket_type)}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // Inject live counts into each ticket_type row
  const enriched = (events || []).map((event: any) => ({
    ...event,
    ticket_types: (event.ticket_types || []).map((tt: any) => {
      const key = `${event.id}:${normalizeTicketType(tt.name)}`;
      return {
        ...tt,
        sold_count: countMap.get(key) ?? 0,
      };
    }),
  }));

  return NextResponse.json({ events: enriched });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const body = await req.json();

  // If copy_from_id provided, duplicate that event (with its ticket types, zero sold)
  if (body.copy_from_id) {
    const { data: src } = await db.from("events").select("*, ticket_types(*)").eq("id", body.copy_from_id).single();
    if (!src) return NextResponse.json({ error: "Source event not found" }, { status: 404 });

    const { ticket_types, id, created_at, updated_at, ...srcFields } = src;
    const newSlug = `${srcFields.slug}-copy-${Date.now()}`;
    const { data: newEvent, error } = await db.from("events").insert({
      ...srcFields,
      slug: newSlug,
      title: `${srcFields.title || srcFields.city} (Copy)`,
      date: "",
      date_iso: new Date("2027-01-01").toISOString(),
      status: "draft",
      sort_order: (srcFields.sort_order || 0) + 100,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Copy ticket types with zero sold_count
    const newTypes = (ticket_types || []).map(({ id: _id, event_id: _eid, sold_count: _sc, created_at: _ca, updated_at: _ua, ...tt }: any) => ({
      ...tt,
      event_id: newEvent.id,
      sold_count: 0,
    }));
    if (newTypes.length > 0) {
      await db.from("ticket_types").insert(newTypes);
    }

    const { data: fullEvent } = await db.from("events").select("*, ticket_types(*)").eq("id", newEvent.id).single();
    return NextResponse.json({ event: fullEvent });
  }

  // Create blank event
  const { data: newEvent, error } = await db.from("events").insert({
    slug: `new-event-${Date.now()}`,
    city: "New City",
    state: "",
    title: "New Event",
    date: "",
    date_iso: new Date("2027-01-01").toISOString(),
    time: "3:00 PM – 9:00 PM",
    venue: "",
    venue_detail: "",
    venue_address: "",
    description: "",
    color: "#F5A623",
    tag: "",
    emoji: "🥃",
    free_parking: false,
    capacity: 500,
    status: "draft",
    sort_order: 999,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: { ...newEvent, ticket_types: [] } });
}
