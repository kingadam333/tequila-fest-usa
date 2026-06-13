import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Get all orders for this email, then all ticket instances for those orders
  const { data: orders } = await db
    .from("ticket_orders")
    .select("id, order_number")
    .eq("customer_email", email.toLowerCase())
    .eq("status", "paid");

  if (!orders?.length) return NextResponse.json({ tickets: [] });

  const orderIds = orders.map((o: any) => o.id);

  const { data: tickets, error } = await db
    .from("ticket_instances")
    .select(`
      id, ticket_number, ticket_type, holder_name, qr_code,
      status, checked_in_at, event_city, event_slug, created_at,
      order_id,
      ticket_orders (order_number, customer_name, quantity, total, created_at)
    `)
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tickets: tickets || [] });
}
