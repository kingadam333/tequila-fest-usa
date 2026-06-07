import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Simple token check — same ADMIN_PASSWORD used for admin dashboard
function verifyToken(req: NextRequest) {
  const auth = req.headers.get("x-checkin-token") || "";
  return auth === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const eventSlug = searchParams.get("event") || "";

  if (!q) return NextResponse.json({ results: [] });

  const db = supabaseAdmin as any;

  // Try exact QR code match first
  const { data: byQr } = await db
    .from("ticket_instances")
    .select(`
      id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at, event_city, event_slug,
      ticket_orders!inner(order_number, customer_email, customer_name, quantity)
    `)
    .eq("qr_code", q)
    .limit(1);

  if (byQr && byQr.length > 0) {
    return NextResponse.json({ results: byQr, matchType: "qr" });
  }

  // Search by order number, name, or email
  let query = db
    .from("ticket_instances")
    .select(`
      id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at, event_city, event_slug,
      ticket_orders!inner(order_number, customer_email, customer_name, quantity)
    `)
    .limit(20);

  if (eventSlug) query = query.eq("event_slug", eventSlug);

  // Search across order_number, customer_name, customer_email
  const { data: byOrder } = await db
    .from("ticket_instances")
    .select(`
      id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at, event_city, event_slug,
      ticket_orders!inner(order_number, customer_email, customer_name, quantity)
    `)
    .ilike("ticket_orders.order_number", `%${q}%`)
    .limit(10);

  const { data: byName } = await db
    .from("ticket_instances")
    .select(`
      id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at, event_city, event_slug,
      ticket_orders!inner(order_number, customer_email, customer_name, quantity)
    `)
    .ilike("ticket_orders.customer_name", `%${q}%`)
    .limit(10);

  const { data: byEmail } = await db
    .from("ticket_instances")
    .select(`
      id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at, event_city, event_slug,
      ticket_orders!inner(order_number, customer_email, customer_name, quantity)
    `)
    .ilike("ticket_orders.customer_email", `%${q}%`)
    .limit(10);

  // Merge & deduplicate by id
  const all = [...(byOrder || []), ...(byName || []), ...(byEmail || [])];
  const seen = new Set<string>();
  const results = all.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    // Filter by event if provided
    if (eventSlug && r.event_slug !== eventSlug) return false;
    return true;
  });

  return NextResponse.json({ results, matchType: "search" });
}
