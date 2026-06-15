import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin as any;
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const { data: events, error } = await db
    .from("events")
    .select("id, slug, city, state, date, date_iso, time, venue, venue_detail, color, emoji, tag, free_parking, status, sort_order")
    .gte("date_iso", today)                              // only upcoming/today
    .not("status", "in", '("draft","cancelled","completed")')
    .order("date_iso", { ascending: true });

  if (error) return NextResponse.json({ events: [] });
  return NextResponse.json({ events: events || [] });
}
