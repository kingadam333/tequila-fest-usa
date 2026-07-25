import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType } from "@/lib/normalizeTicketType";
import { fetchAllRows } from "@/lib/fetchAllRows";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin as any;

  const { data: event } = await db.from("events").select("id").eq("slug", slug).single();
  if (!event) return NextResponse.json({ ticketTypes: [] });

  const { data: ticketTypes } = await db
    .from("ticket_types")
    .select("id, name, price, capacity, sold_count, is_active, sort_order, platform_fee")
    .eq("event_id", event.id)
    .order("sort_order");

  if (!ticketTypes?.length) return NextResponse.json({ ticketTypes: [] });

  // Count from ticket_instances (source of truth), joined server-side to
  // ticket_orders instead of building a client-side order_id IN(...) list —
  // that pattern silently broke once an event crossed a few hundred paid
  // orders (the query either errored or the giant list got rejected, and
  // with no error handling on the old query this route just returned 0
  // sold_count for every ticket type instead of failing loudly).
  const instances = await fetchAllRows<{ ticket_type: string }>((from, to) =>
    db
      .from("ticket_instances")
      .select("ticket_type, ticket_orders!inner(status)")
      .eq("event_id", event.id)
      .eq("ticket_orders.status", "paid")
      .range(from, to)
  );

  const realCounts = new Map<string, number>();
  for (const ti of instances) {
    const key = normalizeTicketType(ti.ticket_type);
    realCounts.set(key, (realCounts.get(key) || 0) + 1);
  }

  const enriched = ticketTypes.map((tt: any) => ({
    ...tt,
    sold_count: realCounts.get(normalizeTicketType(tt.name)) ?? 0,
  }));

  return NextResponse.json({ ticketTypes: enriched });
}
