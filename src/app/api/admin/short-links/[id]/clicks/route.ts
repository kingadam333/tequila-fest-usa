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
    .select("clicked_at")
    .eq("short_link_id", id)
    .order("clicked_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byDay = new Map<string, number>();
  for (const row of data || []) {
    const day = new Date(row.clicked_at).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }

  const days = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ days, loggedTotal: data?.length || 0 });
}
