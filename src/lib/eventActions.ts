import { supabaseAdmin } from "@/lib/supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findEventRow(slugOrId: string) {
  const db = supabaseAdmin as any;
  const { data } = await db.from("events").select("*, ticket_types(*)").eq("slug", slugOrId).maybeSingle();
  if (data) return data;
  if (UUID_RE.test(slugOrId)) {
    const { data: byId } = await db.from("events").select("*, ticket_types(*)").eq("id", slugOrId).maybeSingle();
    return byId;
  }
  return null;
}

export async function listEvents() {
  const db = supabaseAdmin as any;
  const { data } = await db
    .from("events")
    .select("id, slug, city, state, title, date, status, capacity")
    .order("sort_order", { ascending: true });
  return { events: data || [] };
}

export async function getEventDetails(slugOrId: string) {
  const event = await findEventRow(slugOrId);
  if (!event) return { found: false };
  return { found: true, event };
}

// Creates a new event row. NOTE: checkout/pricing currently reads from the
// static EVENTS array in src/lib/events.ts, not this DB table (a known,
// pre-existing split in the app — the admin Events UI has always only
// written to the DB). A new event created here shows up in the admin
// dashboard immediately, but going live for public ticket sales still
// requires a code change to src/lib/events.ts and a deploy. The AI should
// tell the admin this whenever it creates an event.
export async function createEvent(fields: {
  slug: string; city: string; state: string; title: string; date: string; dateIso: string; time: string;
  venue: string; venueDetail: string; venueAddress: string; description?: string; color?: string;
  tag?: string; emoji?: string; freeParking?: boolean; capacity?: number;
}) {
  const db = supabaseAdmin as any;
  const { data: existing } = await db.from("events").select("id").eq("slug", fields.slug).maybeSingle();
  if (existing) return { success: false, reason: "An event with that slug already exists." };

  const { data: maxSort } = await db.from("events").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sortOrder = (maxSort?.sort_order || 0) + 1;

  const { data, error } = await db.from("events").insert({
    slug: fields.slug,
    city: fields.city,
    state: fields.state,
    title: fields.title,
    date: fields.date,
    date_iso: fields.dateIso,
    time: fields.time,
    venue: fields.venue,
    venue_detail: fields.venueDetail,
    venue_address: fields.venueAddress,
    description: fields.description || null,
    color: fields.color || "#F5A623",
    tag: fields.tag || null,
    emoji: fields.emoji || null,
    free_parking: fields.freeParking ?? false,
    capacity: fields.capacity ?? 500,
    status: "upcoming",
    sort_order: sortOrder,
  }).select().single();

  if (error) return { success: false, reason: error.message };
  return { success: true, event: data };
}

const EVENT_COLUMN_MAP: Record<string, string> = {
  dateIso: "date_iso", venueDetail: "venue_detail", venueAddress: "venue_address",
  freeParking: "free_parking", sortOrder: "sort_order", ogImage: "og_image",
};

export async function updateEvent(slugOrId: string, updates: Record<string, unknown>) {
  const event = await findEventRow(slugOrId);
  if (!event) return { success: false, reason: "Event not found" };

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(updates)) {
    dbUpdates[EVENT_COLUMN_MAP[key] || key] = value;
  }

  const db = supabaseAdmin as any;
  const { data, error } = await db.from("events").update(dbUpdates).eq("id", event.id).select().single();
  if (error) return { success: false, reason: error.message };
  return { success: true, event: data };
}

export async function adjustTicketCapacity(eventSlugOrId: string, ticketTypeName: string, newCapacity: number) {
  const event = await findEventRow(eventSlugOrId);
  if (!event) return { success: false, reason: "Event not found" };

  const db = supabaseAdmin as any;
  const { data: tt } = await db
    .from("ticket_types")
    .select("id, name, sold_count")
    .eq("event_id", event.id)
    .ilike("name", ticketTypeName)
    .maybeSingle();
  if (!tt) return { success: false, reason: `No ticket type matching "${ticketTypeName}" found for this event.` };
  if (newCapacity < tt.sold_count) {
    return { success: false, reason: `Can't set capacity below ${tt.sold_count} — that many are already sold.` };
  }

  const { error } = await db.from("ticket_types").update({ capacity: newCapacity, updated_at: new Date().toISOString() }).eq("id", tt.id);
  if (error) return { success: false, reason: error.message };
  return { success: true, ticketType: tt.name, newCapacity };
}

export async function addTicketType(eventSlugOrId: string, fields: {
  name: string; price: number; capacity: number; isGa?: boolean; platformFee?: number;
}) {
  const event = await findEventRow(eventSlugOrId);
  if (!event) return { success: false, reason: "Event not found" };

  const db = supabaseAdmin as any;
  const { data: maxSort } = await db
    .from("ticket_types")
    .select("sort_order")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxSort?.sort_order || 0) + 1;

  const { data, error } = await db.from("ticket_types").insert({
    event_id: event.id,
    name: fields.name,
    price: fields.price,
    capacity: fields.capacity,
    sold_count: 0,
    sort_order: sortOrder,
    is_active: true,
    is_ga: fields.isGa ?? false,
    platform_fee: fields.platformFee ?? 0,
  }).select().single();

  if (error) return { success: false, reason: error.message };
  return { success: true, ticketType: data };
}
