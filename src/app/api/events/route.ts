import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin as any;
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const { data: events, error } = await db
    .from("events")
    .select("id, slug, city, state, date, date_iso, time, venue, venue_detail, color, emoji, tag, free_parking, status, sort_order, ticket_types(name, price, capacity, sold_count, is_active)")
    .gte("date_iso", today)                              // only upcoming/today
    .not("status", "in", '("draft","cancelled","completed")')
    .order("date_iso", { ascending: true });

  if (error) return NextResponse.json({ events: [] });

  const enriched = (events || []).map((e: any) => {
    const ga = (e.ticket_types || []).find((tt: any) => tt.name === "GA");
    const gaAvailable = !!ga && ga.is_active !== false && ga.sold_count < ga.capacity;
    const { ticket_types, ...rest } = e;
    return { ...rest, gaPrice: gaAvailable ? Number(ga.price) : null };
  });

  return NextResponse.json({ events: enriched });
}
