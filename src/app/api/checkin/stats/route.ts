import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyCheckinAccess } from "@/lib/checkinAuth";
import { normalizeTicketType, sortByType } from "@/lib/normalizeTicketType";

export async function GET(req: NextRequest) {
  if (!await verifyCheckinAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventSlug = searchParams.get("event") || "";

  const db = supabaseAdmin as any;

  let query = db.from("ticket_instances").select("status, ticket_type, event_slug").limit(20000);
  if (eventSlug) query = query.eq("event_slug", eventSlug);

  const { data } = await query;
  if (!data) return NextResponse.json({ total: 0, checkedIn: 0, byType: {} });

  const total = data.length;
  const checkedIn = data.filter((t: any) => t.status === "used").length;

  const byTypeRaw: Record<string, { total: number; checkedIn: number }> = {};
  for (const t of data) {
    const key = normalizeTicketType(t.ticket_type);
    if (!byTypeRaw[key]) byTypeRaw[key] = { total: 0, checkedIn: 0 };
    byTypeRaw[key].total++;
    if (t.status === "used") byTypeRaw[key].checkedIn++;
  }

  return NextResponse.json({ total, checkedIn, byType: sortByType(byTypeRaw) });
}
