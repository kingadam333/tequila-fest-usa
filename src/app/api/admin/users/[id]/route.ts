import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: user } = await db.from("customer_accounts").select("*").eq("id", id).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: orders } = await db
    .from("ticket_orders")
    .select("*, ticket_instances(*)")
    .eq("customer_email", user.email)
    .order("created_at", { ascending: false });

  return NextResponse.json({ user, orders: orders || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const { action, eventSlug, eventCity, ticketType } = await req.json();

  const db = supabaseAdmin as any;

  if (action === "comp_ticket") {
    if (!eventSlug || !ticketType) {
      return NextResponse.json({ error: "eventSlug and ticketType required" }, { status: 400 });
    }

    const { data: user } = await db.from("customer_accounts").select("*").eq("id", id).single();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const orderNumber = `COMP-${Date.now().toString(36).toUpperCase()}`;

    // Create comp order
    const { data: order, error: orderErr } = await db.from("ticket_orders").insert({
      order_number: orderNumber,
      customer_email: user.email,
      customer_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
      event_slug: eventSlug,
      event_city: eventCity || eventSlug,
      ticket_type: ticketType,
      quantity: 1,
      unit_price: 0,
      subtotal: 0,
      discount_amount: 0,
      total: 0,
      status: "paid",
      stripe_session_id: null,
    }).select().single();

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    // Create ticket instance
    const qrCode = `TKT-${(order as any).id.slice(-6).toUpperCase()}-${ticketType.replace(/\s/g, "").slice(0, 3).toUpperCase()}-001-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    await db.from("ticket_instances").insert({
      order_id: (order as any).id,
      ticket_number: 1,
      event_slug: eventSlug,
      event_city: eventCity || eventSlug,
      ticket_type: ticketType,
      holder_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
      qr_code: qrCode,
      status: "valid",
    });

    return NextResponse.json({ success: true, orderNumber, qrCode });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: user } = await db.from("customer_accounts").select("email").eq("id", id).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from customer_accounts
  await db.from("customer_accounts").delete().eq("id", id);

  // Delete from Supabase auth
  const { data: authUser } = await (supabaseAdmin as any).auth.admin.listUsers();
  const match = (authUser?.users || []).find((u: any) => u.email === user.email);
  if (match) await (supabaseAdmin as any).auth.admin.deleteUser(match.id);

  return NextResponse.json({ success: true });
}
