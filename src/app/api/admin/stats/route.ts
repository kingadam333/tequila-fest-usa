import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { normalizeTicketType, sortByType } from "@/lib/normalizeTicketType";
import { fetchAllRows } from "@/lib/fetchAllRows";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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

  // Fetch ticket_instances with their parent order embedded via a single
  // inner-joined query, filtered server-side in Postgres — avoids ever
  // building a giant order_id IN(...) list client-side, which broke once
  // order counts grew past a few hundred (the resulting URL/query got
  // rejected outright). Media-partner comp tickets ($0, source:
  // "media_comp") are excluded so giveaways never appear as real
  // revenue/sales in these numbers.
  const instances = await fetchAllRows<any>((from, to) => {
    let q = db
      .from("ticket_instances")
      .select("ticket_type, event_id, order_id, ticket_orders!inner(id, event_city, event_slug, total, created_at, status, source)")
      .eq("ticket_orders.status", "paid")
      .neq("ticket_orders.source", "media_comp")
      .range(from, to);
    if (cityFilter) q = q.ilike("ticket_orders.event_city", `%${cityFilter}%`);
    if (yearFilter) {
      q = q.gte("ticket_orders.created_at", `${yearFilter}-01-01`).lte("ticket_orders.created_at", `${yearFilter}-12-31T23:59:59`);
    }
    return q;
  });

  if (instances.length === 0) {
    return NextResponse.json({
      source: "supabase",
      totalRevenue: 0, totalTickets: 0, totalOrders: 0, ordersToday: 0,
      byCity: {}, byEvent: {}, totalServiceFees: 0, totalPlatformFees: 0,
      totalStripeFees: 0, totalTicketRevenue: 0,
    });
  }

  // Dedup orders from the embedded join (every paid order has ≥1 instance)
  const orderMap = new Map<string, { total: number; created_at: string; event_city: string }>();
  const ticketCountByOrder = new Map<string, number>();
  for (const ti of instances) {
    const o = ti.ticket_orders;
    if (o && !orderMap.has(o.id)) {
      orderMap.set(o.id, { total: Number(o.total), created_at: o.created_at, event_city: o.event_city });
    }
    ticketCountByOrder.set(ti.order_id, (ticketCountByOrder.get(ti.order_id) || 0) + 1);
  }
  const orders = Array.from(orderMap.values());

  const today = new Date().toISOString().split("T")[0];
  const totalTickets = instances.length;
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const ordersToday = orders.filter(o => String(o.created_at).startsWith(today)).length;
  const totalOrders = orders.length;

  // Per-city breakdown
  const byCity: Record<string, { revenue: number; tickets: number; byType: Record<string, number> }> = {};

  for (const ti of instances) {
    const order = orderMap.get(ti.order_id);
    if (!order) continue;
    const city = order.event_city || ti.ticket_orders?.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].tickets++;
    const type = normalizeTicketType(ti.ticket_type);
    byCity[city].byType[type] = (byCity[city].byType[type] || 0) + 1;
  }

  const cityRevenueAttributed = new Set<string>();
  for (const ti of instances) {
    const o = ti.ticket_orders;
    if (!o || cityRevenueAttributed.has(o.id)) continue;
    cityRevenueAttributed.add(o.id);
    const city = o.event_city || "Unknown";
    if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0, byType: {} };
    byCity[city].revenue += Number(o.total);
  }

  for (const city of Object.keys(byCity)) {
    byCity[city].byType = sortByType(byCity[city].byType);
  }

  // Per-event breakdown (by event_id, not city name) — a city's slug gets
  // reassigned to a new event row on year rollover (see events section of
  // CLAUDE.md), so grouping by city alone can't distinguish "Cincinnati
  // 2026" from "Cincinnati 2027". event_id is stamped on ticket_instances at
  // purchase time and never changes.
  const byEvent: Record<string, { revenue: number; tickets: number; byType: Record<string, number> }> = {};
  const revenueAttributed = new Set<string>();

  for (const ti of instances) {
    if (!ti.event_id) continue;
    const order = orderMap.get(ti.order_id);
    if (!order) continue;
    if (!byEvent[ti.event_id]) byEvent[ti.event_id] = { revenue: 0, tickets: 0, byType: {} };
    byEvent[ti.event_id].tickets++;
    const type = normalizeTicketType(ti.ticket_type);
    byEvent[ti.event_id].byType[type] = (byEvent[ti.event_id].byType[type] || 0) + 1;

    if (!revenueAttributed.has(ti.order_id)) {
      byEvent[ti.event_id].revenue += order.total;
      revenueAttributed.add(ti.order_id);
    }
  }

  for (const eventId of Object.keys(byEvent)) {
    byEvent[eventId].byType = sortByType(byEvent[eventId].byType);
  }

  // Fee analytics
  const { calculateFees } = await import("@/lib/fees");
  let totalServiceFees = 0;
  let totalPlatformFees = 0;
  let totalStripeFees = 0;
  let totalTicketRevenue = 0;
  for (const [orderId, o] of orderMap) {
    const qty = ticketCountByOrder.get(orderId) || 1;
    const f = calculateFees(o.total, qty);
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
    byEvent,
    totalServiceFees: parseFloat(totalServiceFees.toFixed(2)),
    totalPlatformFees: parseFloat(totalPlatformFees.toFixed(2)),
    totalStripeFees: parseFloat(totalStripeFees.toFixed(2)),
    totalTicketRevenue: parseFloat(totalTicketRevenue.toFixed(2)),
  });
}
