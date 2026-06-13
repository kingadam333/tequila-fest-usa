import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const normalize = (raw: string): string => {
  const s = (raw || "").toLowerCase().trim();
  if (s === "regular" || s === "regular rate") return "Regular Rate";
  if (s === "vip" || s === "vip experience") return "VIP Experience";
  if (s === "early bird" || s === "earlybird") return "Early Bird";
  if (s === "late registration" || s === "late_registration") return "Late Registration";
  if (s === "ga" || s === "ga entry") return "GA";
  return raw;
};

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

  // Count real sold tickets from ticket_instances (source of truth)
  const { data: instances } = await db
    .from("ticket_instances")
    .select("ticket_type, order_id")
    .in("order_id",
      (await db.from("ticket_orders").select("id").eq("event_slug", slug).eq("status", "paid")).data?.map((o: any) => o.id) || []
    );

  const realCounts = new Map<string, number>();
  for (const ti of instances || []) {
    const key = normalize(ti.ticket_type);
    realCounts.set(key, (realCounts.get(key) || 0) + 1);
  }

  const enriched = ticketTypes.map((tt: any) => ({
    ...tt,
    sold_count: realCounts.get(normalize(tt.name)) ?? tt.sold_count ?? 0,
  }));

  // Return all types — callers use is_active to hide/disable closed tiers
  return NextResponse.json({ ticketTypes: enriched });
}
