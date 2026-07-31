import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Daily click breakdown for one QR/short link. Only reflects clicks logged
// since short_link_clicks was added — the link's own `clicks` counter (on
// short_links) may be higher if it predates this table.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data, error } = await db
    .from("short_link_clicks")
    .select("clicked_at, visitor_id")
    .eq("short_link_id", id)
    .order("clicked_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byDay = new Map<string, { count: number; visitors: Set<string> }>();
  const allVisitors = new Set<string>();
  for (const row of data || []) {
    const day = new Date(row.clicked_at).toISOString().slice(0, 10);
    const bucket = byDay.get(day) || { count: 0, visitors: new Set<string>() };
    bucket.count += 1;
    if (row.visitor_id) { bucket.visitors.add(row.visitor_id); allVisitors.add(row.visitor_id); }
    byDay.set(day, bucket);
  }

  const days = Array.from(byDay.entries())
    .map(([date, b]) => ({ date, count: b.count, uniqueCount: b.visitors.size }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ days, loggedTotal: data?.length || 0, uniqueTotal: allVisitors.size });
}
