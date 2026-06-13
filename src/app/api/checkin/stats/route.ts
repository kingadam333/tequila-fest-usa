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
  const checkedIn = data.filter((t: any) => t.status === "used").length;

  // Normalize variant type names → canonical display names
  const normalize = (raw: string): string => {
    const s = (raw || "").toLowerCase().trim();
    if (s === "regular" || s === "regular rate") return "Regular Rate";
    if (s === "vip" || s === "vip experience") return "VIP Experience";
    if (s === "early bird" || s === "earlybird") return "Early Bird";
    if (s === "late registration" || s === "late_registration") return "Late Registration";
    if (s === "ga" || s === "ga entry") return "GA";
    return raw;
  };

  // Breakdown by ticket type (merged)
  const byType: Record<string, { total: number; checkedIn: number }> = {};
  for (const t of data) {
    const key = normalize(t.ticket_type);
    if (!byType[key]) byType[key] = { total: 0, checkedIn: 0 };
    byType[key].total++;
    if (t.status === "used") byType[key].checkedIn++;
  }

  return NextResponse.json({ total, checkedIn, byType });
}
