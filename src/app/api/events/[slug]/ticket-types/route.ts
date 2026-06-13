import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType } from "@/lib/normalizeTicketType";

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

  // Get paid order IDs for this event
  const { data: paidOrders } = await db
    .from("ticket_orders")
    .select("id")
    .eq("event_slug", slug)
    .eq("status", "paid");

  const orderIds = (paidOrders || []).map((o: any) => o.id);

  // Count from ticket_instances (source of truth)
  const realCounts = new Map<string, number>();
  if (orderIds.length > 0) {
    const { data: instances } = await db
      .from("ticket_instances")
      .select("ticket_type")
      .in("order_id", orderIds);

    for (const ti of instances || []) {
      const key = normalizeTicketType(ti.ticket_type);
      realCounts.set(key, (realCounts.get(key) || 0) + 1);
    }
  }

  const enriched = ticketTypes.map((tt: any) => ({
    ...tt,
    sold_count: realCounts.get(normalizeTicketType(tt.name)) ?? 0,
  }));

  return NextResponse.json({ ticketTypes: enriched });
}
