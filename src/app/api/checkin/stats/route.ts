import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyCheckinAccess } from "@/lib/checkinAuth";

export async function GET(req: NextRequest) {
  if (!await verifyCheckinAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventSlug = searchParams.get("event") || "";

  const db = supabaseAdmin as any;

  let query = db.from("ticket_instances").select("status, ticket_type, event_slug, event_city");
  if (eventSlug) query = query.eq("event_slug", eventSlug);

  const { data } = await query;
  if (!data) return NextResponse.json({ total: 0, checkedIn: 0, byType: {} });

  const total = data.length;
  const checkedIn = data.filter((t: any) => t.status === "checked_in").length;

  // Breakdown by ticket type
  const byType: Record<string, { total: number; checkedIn: number }> = {};
  for (const t of data) {
    if (!byType[t.ticket_type]) byType[t.ticket_type] = { total: 0, checkedIn: 0 };
    byType[t.ticket_type].total++;
    if (t.status === "checked_in") byType[t.ticket_type].checkedIn++;
  }

  return NextResponse.json({ total, checkedIn, byType });
}
