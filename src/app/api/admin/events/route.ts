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

  // Fetch live sold counts from ticket_orders (paid only)
  const { data: liveCounts } = await db
    .from("ticket_orders")
    .select("event_city, ticket_type, quantity")
    .eq("status", "paid");

  // Build lookup map: "city:type" → total quantity sold
  const countMap = new Map<string, number>();
  for (const row of liveCounts || []) {
    const key = `${(row.event_city || "").toLowerCase()}:${(row.ticket_type || "").toLowerCase()}`;
    countMap.set(key, (countMap.get(key) || 0) + (row.quantity || 1));
  }

  // Inject live counts into ticket_types
  const enriched = (events || []).map((event: any) => ({
    ...event,
    ticket_types: (event.ticket_types || []).map((tt: any) => {
      const key = `${(event.city || "").toLowerCase()}:${(tt.name || "").toLowerCase()}`;
      return {
        ...tt,
        sold_count: countMap.get(key) ?? tt.sold_count ?? 0,
      };
    }),
  }));

  return NextResponse.json({ events: enriched });
}
