import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  // Use Supabase if configured, fall back to Stripe
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getSupabaseStats();
  }
  return getStripeStats();
}

async function getSupabaseStats() {
  const { supabaseAdmin } = await import("@/lib/supabase");

  const { data: orders, error } = await supabaseAdmin
    .from("ticket_orders")
    .select("event_city, ticket_type, quantity, total, status, created_at")
    .eq("status", "paid");

  if (error) {
    console.error("Supabase stats error:", error);
    return getStripeStats();
  }

  const rows = (orders || []) as Array<{ event_city: string; ticket_type: string; quantity: number; total: string | number; created_at: string; }>;
  const today = new Date().toISOString().split("T")[0];
  const totalRevenue = rows.reduce((s, o) => s + Number(o.total), 0);
  const totalTickets = rows.reduce((s, o) => s + Number(o.quantity), 0);
  const ordersToday = rows.filter(o => String(o.created_at).startsWith(today)).length;

  // Per-city breakdown with ticket type split
  const byCity: Record<string, {
    revenue: number;
    tickets: number;
    byType: Record<string, number>;
  }> = {};

  for (const o of rows) {
    const city = o.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].revenue += Number(o.total);
    byCity[city].tickets += o.quantity;
    const type = o.ticket_type || "unknown";
    byCity[city].byType[type] = (byCity[city].byType[type] || 0) + o.quantity;
  }

  // Fee analytics
  const { calculateFees } = await import("@/lib/fees");
  let totalServiceFees = 0;
  let totalTicketRevenue = 0;
  for (const o of rows) {
    const qty = Number(o.quantity);
    const total = Number(o.total);
    // Estimate ticket subtotal (total includes fees for new orders, may not for migrated ones)
    const f = calculateFees(total, qty);
    totalServiceFees += f.serviceFee;
    totalTicketRevenue += f.subtotal;
  }

  return NextResponse.json({
    source: "supabase",
    totalRevenue,
    totalTickets,
    totalOrders: rows.length,
    ordersToday,
    byCity,
    totalServiceFees: parseFloat(totalServiceFees.toFixed(2)),
    totalTicketRevenue: parseFloat(totalTicketRevenue.toFixed(2)),
  });
}

async function getStripeStats() {
  const { stripe } = await import("@/lib/stripe");

  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    const ticketSessions = sessions.data.filter(
      s => s.metadata?.type === "ticket_purchase" && s.payment_status === "paid"
    );

    const totalRevenue = ticketSessions.reduce((s, o) => s + (o.amount_total || 0) / 100, 0);
    const totalTickets = ticketSessions.reduce((s, o) => s + parseInt(o.metadata?.quantity || "1"), 0);
    const today = new Date().toISOString().split("T")[0];
    const ordersToday = ticketSessions.filter(s => new Date(s.created * 1000).toISOString().startsWith(today)).length;

    const byCity: Record<string, { revenue: number; tickets: number; byType: Record<string, number> }> = {};
    for (const s of ticketSessions) {
      const city = s.metadata?.eventCity || "Unknown";
      if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
      byCity[city].revenue += (s.amount_total || 0) / 100;
      const qty = parseInt(s.metadata?.quantity || "1");
      byCity[city].tickets += qty;
      const type = s.metadata?.ticketType || "unknown";
      byCity[city].byType[type] = (byCity[city].byType[type] || 0) + qty;
    }

    return NextResponse.json({ source: "stripe", totalRevenue, totalTickets, totalOrders: ticketSessions.length, ordersToday, byCity });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
