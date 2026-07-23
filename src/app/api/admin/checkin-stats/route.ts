import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType, sortByType } from "@/lib/normalizeTicketType";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";

  const db = supabaseAdmin as any;

  // Ticket stats from ticket_instances (status = 'used' for checked-in)
  let q = db.from("ticket_instances").select("status, ticket_type, event_city, event_slug").limit(20000);
  if (city) q = q.ilike("event_city", city);
  const { data: tickets } = await q;

  const total = tickets?.length ?? 0;
  const checkedIn = tickets?.filter((t: any) => t.status === "used").length ?? 0;

  const byTypeRaw: Record<string, { total: number; checkedIn: number }> = {};
  for (const t of (tickets ?? [])) {
    const key = normalizeTicketType(t.ticket_type);
    if (!byTypeRaw[key]) byTypeRaw[key] = { total: 0, checkedIn: 0 };
    byTypeRaw[key].total++;
    if (t.status === "used") byTypeRaw[key].checkedIn++;
  }
  const byType = sortByType(byTypeRaw);

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
