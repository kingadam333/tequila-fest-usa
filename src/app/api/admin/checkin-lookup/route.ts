import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { query, eventCity } = await req.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Try matching by qr_code or ticket_number
  let q = db
    .from("ticket_instances")
    .select("id, ticket_number, holder_name, ticket_type, status, checked_in_at, event_city, qr_code")
    .or(`qr_code.eq.${query},ticket_number.eq.${query}`)
    .limit(1)
    .maybeSingle();

  if (eventCity) {
    q = db
      .from("ticket_instances")
      .select("id, ticket_number, holder_name, ticket_type, status, checked_in_at, event_city, qr_code")
      .or(`qr_code.eq.${query},ticket_number.eq.${query}`)
      .eq("event_city", eventCity)
      .limit(1)
      .maybeSingle();
  }

  const { data: ticket, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!ticket) return NextResponse.json({ error: `No ticket found for: ${query}` }, { status: 404 });

  return NextResponse.json({ ticket });
}
