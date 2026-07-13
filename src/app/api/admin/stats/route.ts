import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { normalizeTicketType, sortByType } from "@/lib/normalizeTicketType";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const cityFilter = searchParams.get("city") || ""; // e.g. "Cincinnati"
  const yearFilter = searchParams.get("year") || ""; // e.g. "2026"

  return getSupabaseStats(cityFilter, yearFilter);
}

async function getSupabaseStats(cityFilter: string, yearFilter: string) {
  const { supabaseAdmin } = await import("@/lib/supabase");
  const db = supabaseAdmin as any;

  // Build order query with optional city/year filters. Media-partner comp
  // tickets ($0, source: "media_comp") are excluded so giveaways never
  // appear as real revenue/sales in these numbers.
  let orderQuery = db
    .from("ticket_orders")
    .select("id, event_city, event_slug, total, created_at, status")
    .eq("status", "paid")
    .neq("source", "media_comp");

  if (cityFilter) orderQuery = orderQuery.ilike("event_city", `%${cityFilter}%`);
  if (yearFilter) {
    orderQuery = orderQuery
      .gte("created_at", `${yearFilter}-01-01`)
      .lte("created_at", `${yearFilter}-12-31T23:59:59`);
  }

  const { data: orders } = await orderQuery;

  const orderIds = (orders || []).map((o: any) => o.id);

  // Fetch ticket_instances filtered to matching orders
  let instanceQuery = db
    .from("ticket_instances")
    .select("ticket_type, event_slug, event_city, order_id");

  if (orderIds.length > 0) {
    instanceQuery = instanceQuery.in("order_id", orderIds);
  } else if (cityFilter || yearFilter) {
    // Filters active but no matching orders — return zeros
    return NextResponse.json({
      source: "supabase",
      totalRevenue: 0, totalTickets: 0, totalOrders: 0, ordersToday: 0,
      byCity: {}, totalServiceFees: 0, totalPlatformFees: 0,
      totalStripeFees: 0, totalTicketRevenue: 0,
    });
  }

  const { data: instances, error } = await instanceQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderMap = new Map<string, { total: number; created_at: string; event_city: string }>();
  for (const o of orders || []) {
    orderMap.set(o.id, { total: Number(o.total), created_at: o.created_at, event_city: o.event_city });
  }

  const today = new Date().toISOString().split("T")[0];
  const totalTickets = (instances || []).length;
  const totalRevenue = (orders || []).reduce((s: number, o: any) => s + Number(o.total), 0);
  const ordersToday = (orders || []).filter((o: any) => String(o.created_at).startsWith(today)).length;
  const totalOrders = (orders || []).length;

  // Per-city breakdown
  const byCity: Record<string, { revenue: number; tickets: number; byType: Record<string, number> }> = {};

  for (const ti of instances || []) {
    const order = orderMap.get(ti.order_id);
    if (!order) continue;
    const city = order.event_city || ti.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].tickets++;
    const type = normalizeTicketType(ti.ticket_type);
    byCity[city].byType[type] = (byCity[city].byType[type] || 0) + 1;
  }

  for (const o of orders || []) {
    const city = o.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].revenue += Number(o.total);
  }

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
