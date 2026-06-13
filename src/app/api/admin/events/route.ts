import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  // Fetch events + ticket_types
  const { data: events, error } = await db
    .from("events")
    .select(`*, ticket_types(*)`)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count directly from ticket_instances (one row per ticket) — the real source of truth
  const { data: instanceCounts } = await db
    .from("ticket_instances")
    .select("ticket_type, event_slug");

  // Normalize variant type names → canonical display names
  const normalize = (raw: string): string => {
    const s = (raw || "").toLowerCase().trim();
    if (s === "regular" || s === "regular rate") return "regular rate";
    if (s === "vip" || s === "vip experience") return "vip experience";
    if (s === "early bird" || s === "earlybird" || s === "earlybird") return "early bird";
    if (s === "late" || s === "late registration" || s === "late_registration") return "late registration";
    if (s === "ga" || s === "ga entry") return "ga";
    return s;
  };

  // Build lookup map: "slug:normalized_type" → count
  const countMap = new Map<string, number>();
  for (const row of instanceCounts || []) {
    const key = `${(row.event_slug || "").toLowerCase()}:${normalize(row.ticket_type)}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // Inject live counts into ticket_types
  const enriched = (events || []).map((event: any) => ({
    ...event,
    ticket_types: (event.ticket_types || []).map((tt: any) => {
      const key = `${(event.slug || "").toLowerCase()}:${normalize(tt.name)}`;
      return {
        ...tt,
        sold_count: countMap.get(key) ?? tt.sold_count ?? 0,
      };
    }),
  }));

  return NextResponse.json({ events: enriched });
}
