import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";

  const db = supabaseAdmin as any;

  // Ticket stats from ticket_instances
  let q = db.from("ticket_instances").select("status, ticket_type, event_city");
  if (city) q = q.eq("event_city", city);
  const { data: tickets } = await q;

  const total = tickets?.length ?? 0;
  const checkedIn = tickets?.filter((t: any) => t.status === "checked_in").length ?? 0;

  const byType: Record<string, { total: number; checkedIn: number }> = {};
  for (const t of (tickets ?? [])) {
    if (!byType[t.ticket_type]) byType[t.ticket_type] = { total: 0, checkedIn: 0 };
    byType[t.ticket_type].total++;
    if (t.status === "checked_in") byType[t.ticket_type].checkedIn++;
  }

  // Staff list with status
  const { data: staff } = await db
    .from("staff_members")
    .select("id, name, email, permissions, status, last_login_at, invite_expires_at, created_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    total,
    checkedIn,
    remaining: total - checkedIn,
    byType,
    staff: staff ?? [],
  });
}
