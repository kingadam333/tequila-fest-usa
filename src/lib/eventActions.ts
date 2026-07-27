import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType } from "@/lib/normalizeTicketType";

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

// Finds the upcoming (non-draft/cancelled/completed) event for a city —
// same "permanent slug, current event by date" convention used by the
// public event pages (see cityKey() in events/[slug]/page.tsx).
async function findUpcomingEventByCity(city: string) {
  const db = supabaseAdmin as any;
  const today = new Date().toISOString();
  const { data } = await db
    .from("events")
    .select("*, ticket_types(*)")
    .ilike("city", `%${city}%`)
    .gte("date_iso", today)
    .not("status", "in", '("draft","cancelled","completed")')
    .order("date_iso", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

// Live, comp-excluded sold count for one ticket type at one event — never
// trust the stored ticket_types.sold_count column for a decision like this
// (it can drift stale; see the Overview/Events undercounting incidents).
async function countSoldForType(eventId: string, ticketTypeName: string) {
  const db = supabaseAdmin as any;
  const { data } = await db
    .from("ticket_instances")
    .select("ticket_type, ticket_orders!inner(status, source)")
    .eq("event_id", eventId)
    .eq("ticket_orders.status", "paid")
    .neq("ticket_orders.source", "media_comp");
  const target = normalizeTicketType(ticketTypeName);
  return (data || []).filter((r: any) => normalizeTicketType(r.ticket_type) === target).length;
}

// Finds paid orders/tickets by order number, buyer name, or email — for the
// admin AI to identify which order to transfer before calling transferOrderToCity.
export async function findTicketOrders(query: string) {
  const db = supabaseAdmin as any;
  const fields = "id, order_number, customer_name, customer_email, event_slug, event_city, ticket_type, quantity, status, created_at";
  const q = `%${query}%`;
  const [{ data: byOrder }, { data: byName }, { data: byEmail }] = await Promise.all([
    db.from("ticket_orders").select(fields).ilike("order_number", q).eq("status", "paid").limit(10),
    db.from("ticket_orders").select(fields).ilike("customer_name", q).eq("status", "paid").limit(10),
    db.from("ticket_orders").select(fields).ilike("customer_email", q).eq("status", "paid").limit(10),
  ]);
  const merged = new Map<string, any>();
  for (const row of [...(byOrder || []), ...(byName || []), ...(byEmail || [])]) merged.set(row.id, row);
  return { orders: Array.from(merged.values()) };
}

// Moves an entire paid order (and every ticket_instance in it) from its
// current event to the upcoming event for a different city. Always call
// findTicketOrders first to get the exact orderNumber — never guess it.
export async function transferOrderToCity(orderNumber: string, destinationCity: string, allowOverCapacity = false) {
  const db = supabaseAdmin as any;
  const { data: order } = await db.from("ticket_orders").select("*").eq("order_number", orderNumber).maybeSingle();
  if (!order) return { success: false, reason: `No order found with number "${orderNumber}".` };
  if (order.status !== "paid") return { success: false, reason: `Order ${orderNumber} is not a paid order (status: ${order.status}) — can't transfer.` };

  const destEvent = await findUpcomingEventByCity(destinationCity);
  if (!destEvent) return { success: false, reason: `No upcoming event found for "${destinationCity}".` };
  if (destEvent.slug === order.event_slug) {
    return { success: false, reason: `Order ${orderNumber} is already assigned to ${destEvent.city} (${destEvent.slug}).` };
  }

  const destTicketType = (destEvent.ticket_types || []).find(
    (tt: any) => normalizeTicketType(tt.name) === normalizeTicketType(order.ticket_type)
  );
  if (!destTicketType) {
    const available = (destEvent.ticket_types || []).map((t: any) => t.name).join(", ") || "none";
    return { success: false, reason: `${destEvent.city} doesn't offer a "${order.ticket_type}" ticket type. Available types there: ${available}.` };
  }

  if (!allowOverCapacity) {
    const sold = await countSoldForType(destEvent.id, destTicketType.name);
    const remaining = Math.max(destTicketType.capacity - sold, 0);
    if (order.quantity > remaining) {
      return {
        success: false,
        reason: `${destEvent.city}'s ${destTicketType.name} tier only has ${remaining} spot(s) left (${sold} of ${destTicketType.capacity} sold), but this order needs ${order.quantity}. Confirm with the admin whether to move it anyway, then call transfer_order_to_city again with allowOverCapacity: true.`,
      };
    }
  }

  const now = new Date().toISOString();
  const { error: orderErr } = await db.from("ticket_orders")
    .update({ event_slug: destEvent.slug, event_city: destEvent.city, updated_at: now })
    .eq("id", order.id);
  if (orderErr) return { success: false, reason: orderErr.message };

  const { error: instErr } = await db.from("ticket_instances")
    .update({ event_slug: destEvent.slug, event_city: destEvent.city, event_id: destEvent.id })
    .eq("order_id", order.id);
  if (instErr) return { success: false, reason: instErr.message };

  return {
    success: true,
    message: `Moved order ${orderNumber} (${order.quantity} ticket${order.quantity === 1 ? "" : "s"}, ${order.customer_name}) from ${order.event_city} to ${destEvent.city} — ${destEvent.date}.`,
    from: order.event_city,
    to: destEvent.city,
    orderNumber,
  };
}
