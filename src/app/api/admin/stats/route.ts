import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { normalizeTicketType, TICKET_TYPE_ORDER, sortByType } from "@/lib/normalizeTicketType";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  return getSupabaseStats();
}

async function getSupabaseStats() {
  const { supabaseAdmin } = await import("@/lib/supabase");
  const db = supabaseAdmin as any;

  // Use ticket_instances as the source of truth (one row per actual ticket)
  const { data: instances, error } = await db
    .from("ticket_instances")
    .select("ticket_type, event_slug, event_city, order_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch paid orders for revenue + date info
  const { data: orders } = await db
    .from("ticket_orders")
    .select("id, event_city, event_slug, total, created_at, status")
    .eq("status", "paid");

  const orderMap = new Map<string, { total: number; created_at: string; event_city: string }>();
  for (const o of orders || []) {
    orderMap.set(o.id, { total: Number(o.total), created_at: o.created_at, event_city: o.event_city });
  }

  const today = new Date().toISOString().split("T")[0];
  const totalTickets = (instances || []).length;

  // Only count revenue from paid orders once each
  const paidOrderIds = new Set((orders || []).map((o: any) => o.id));
  const totalRevenue = (orders || []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const ordersToday = (orders || []).filter((o: any) => String(o.created_at).startsWith(today)).length;
  const totalOrders = (orders || []).length;

  // Per-city breakdown from ticket_instances
  const byCity: Record<string, { revenue: number; tickets: number; byType: Record<string, number> }> = {};

  for (const ti of instances || []) {
    const order = orderMap.get(ti.order_id);
    if (!order) continue; // skip unpaid
    const city = order.event_city || ti.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].tickets++;
    const type = normalizeTicketType(ti.ticket_type);
    byCity[city].byType[type] = (byCity[city].byType[type] || 0) + 1;
  }

  // Revenue per city — split evenly from order total across tickets in that order
  // (simpler: attribute full order revenue to its city once)
  const cityRevenueAdded = new Set<string>();
  for (const o of orders || []) {
    const city = o.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].revenue += Number(o.total);
  }

  // Sort byType into canonical order for each city
  for (const city of Object.keys(byCity)) {
    byCity[city].byType = sortByType(byCity[city].byType);
  }

  // Fee analytics
  const { calculateFees } = await import("@/lib/fees");
  let totalServiceFees = 0;
  let totalPlatformFees = 0;
  let totalStripeFees = 0;
  let totalTicketRevenue = 0;
  for (const o of orders || []) {
    const qty = (instances || []).filter((ti: any) => ti.order_id === o.id).length || 1;
    const f = calculateFees(Number(o.total), qty);
    totalServiceFees += f.serviceFee;
    totalPlatformFees += f.platformFee;
    totalStripeFees += f.stripeFee;
    totalTicketRevenue += f.subtotal;
  }

  return NextResponse.json({
    source: "supabase",
    totalRevenue,
    totalTickets,
    totalOrders,
    ordersToday,
    byCity,
    totalServiceFees: parseFloat(totalServiceFees.toFixed(2)),
    totalPlatformFees: parseFloat(totalPlatformFees.toFixed(2)),
    totalStripeFees: parseFloat(totalStripeFees.toFixed(2)),
    totalTicketRevenue: parseFloat(totalTicketRevenue.toFixed(2)),
  });
}
