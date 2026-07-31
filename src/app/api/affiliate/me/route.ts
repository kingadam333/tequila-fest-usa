import { NextRequest, NextResponse } from "next/server";
import { verifyAffiliateAccess } from "@/lib/affiliateAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const payload = await verifyAffiliateAccess(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin as any;
  const affiliateId = payload.affiliateId;

  const { data: affiliate } = await db
    .from("affiliates")
    .select("id, first_name, last_name, email, referral_code, commission_rate, status")
    .eq("id", affiliateId)
    .maybeSingle();
  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Stored as a fraction (numeric(4,3)) — see the note in /api/admin/affiliates.
  affiliate.commission_rate = Number(affiliate.commission_rate) * 100;

  const { data: link } = await db.from("short_links").select("slug, clicks, destination_url").eq("affiliate_id", affiliateId).maybeSingle();

  const { data: conversions } = await db
    .from("affiliate_conversions")
    .select("event_city, quantity, sale_amount, commission_amount, created_at")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  const byCity: Record<string, { orders: number; tickets: number; sales: number; commission: number }> = {};
  let totalSales = 0, totalCommission = 0, totalTickets = 0;
  for (const c of conversions || []) {
    const bucket = (byCity[c.event_city] ||= { orders: 0, tickets: 0, sales: 0, commission: 0 });
    bucket.orders += 1;
    bucket.tickets += c.quantity || 0;
    bucket.sales += Number(c.sale_amount) || 0;
    bucket.commission += Number(c.commission_amount) || 0;
    totalSales += Number(c.sale_amount) || 0;
    totalCommission += Number(c.commission_amount) || 0;
    totalTickets += c.quantity || 0;
  }

  const { data: payouts } = await db.from("affiliate_payouts").select("amount, note, paid_at").eq("affiliate_id", affiliateId).order("paid_at", { ascending: false });
  const totalPaid = (payouts || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tequilafestusa.com";
  const refLink = link ? `${siteUrl}/go/${link.slug}` : null;

  return NextResponse.json({
    affiliate,
    refLink,
    destinationUrl: link?.destination_url || null,
    clicks: link?.clicks || 0,
    orders: (conversions || []).length,
    tickets: totalTickets,
    totalSales,
    totalCommission,
    totalPaid,
    balanceOwed: totalCommission - totalPaid,
    byCity,
    payouts: payouts || [],
    recentConversions: (conversions || []).slice(0, 20),
  });
}
