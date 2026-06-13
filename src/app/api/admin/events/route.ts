import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType } from "@/lib/normalizeTicketType";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  // Fetch events + ticket_types
  const { data: events, error } = await db
    .from("events")
    .select(`*, ticket_types(*)`)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count from ticket_instances (one row per ticket — the real source of truth)
  const { data: instances } = await db
    .from("ticket_instances")
    .select("ticket_type, event_slug");

  // Build lookup: "slug:normalizedType" → count
  const countMap = new Map<string, number>();
  for (const ti of instances || []) {
    const key = `${(ti.event_slug || "").toLowerCase()}:${normalizeTicketType(ti.ticket_type)}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // Inject live counts into each ticket_type row
  const enriched = (events || []).map((event: any) => ({
    ...event,
    ticket_types: (event.ticket_types || []).map((tt: any) => {
      const key = `${(event.slug || "").toLowerCase()}:${normalizeTicketType(tt.name)}`;
      return {
        ...tt,
        sold_count: countMap.get(key) ?? 0,
      };
    }),
  }));

  return NextResponse.json({ events: enriched });
}
