import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin as any;

  const { data: event } = await db.from("events").select("id").eq("slug", slug).single();
  if (!event) return NextResponse.json({ ticketTypes: [] });

  const { data: ticketTypes } = await db
    .from("ticket_types")
    .select("name, price, capacity, sold_count, is_active, sort_order")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({ ticketTypes: ticketTypes || [] });
}
