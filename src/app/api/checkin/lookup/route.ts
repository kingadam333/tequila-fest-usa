import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyCheckinAccess } from "@/lib/checkinAuth";

async function getOrderSiblings(db: any, orderId: string) {
  const { data } = await db
    .from("ticket_instances")
    .select("id, ticket_number, ticket_type, status, checked_in_at, holder_name")
    .eq("order_id", orderId)
    .order("ticket_number", { ascending: true });
  return data || [];
}

export async function GET(req: NextRequest) {
  if (!await verifyCheckinAccess(req)) {
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
      id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at,
      event_city, event_slug, order_id,
      ticket_orders(order_number, customer_email, customer_name, quantity)
    `)
    .eq("qr_code", q)
    .limit(1);

  if (byQr && byQr.length > 0) {
    const ticket = byQr[0];
    const orderTickets = await getOrderSiblings(db, ticket.order_id);
    return NextResponse.json({ results: byQr, matchType: "qr", orderTickets });
  }

  // Search by order number, name, or email
  const selectFields = `
    id, ticket_number, ticket_type, holder_name, qr_code, status, checked_in_at,
    event_city, event_slug, order_id,
    ticket_orders!inner(order_number, customer_email, customer_name, quantity)
  `;

  const [{ data: byOrder }, { data: byName }, { data: byEmail }] = await Promise.all([
    db.from("ticket_instances").select(selectFields).ilike("ticket_orders.order_number", `%${q}%`).limit(10),
    db.from("ticket_instances").select(selectFields).ilike("ticket_orders.customer_name", `%${q}%`).limit(10),
    db.from("ticket_instances").select(selectFields).ilike("ticket_orders.customer_email", `%${q}%`).limit(10),
  ]);

  const all = [...(byOrder || []), ...(byName || []), ...(byEmail || [])];
  const seen = new Set<string>();
  const results = all.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    if (eventSlug && r.event_slug !== eventSlug) return false;
    return true;
  });

  return NextResponse.json({ results, matchType: "search" });
}
