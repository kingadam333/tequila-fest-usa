import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  const { data: rawChargebacks, error } = await db
    .from("chargebacks")
    .select("*, ticket_orders(order_number, event_slug, event_city, ticket_type, quantity, created_at, billing_address, card_cvc_check, card_avs_check), vendor_applications(business_name, cities, vendor_type, created_at)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Needs-response/under-review disputes first (these have a clock running
  // and need action), resolved ones (won/lost/closed) after — otherwise a
  // dispute that needs a response today can get buried under old closed ones.
  const OPEN_STATUSES = new Set(["warning_needs_response", "needs_response", "warning_under_review", "under_review"]);
  const chargebacks = [...(rawChargebacks || [])].sort((a: any, b: any) => {
    const aOpen = OPEN_STATUSES.has(a.status) ? 0 : 1;
    const bOpen = OPEN_STATUSES.has(b.status) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return b.created_at.localeCompare(a.created_at);
  });

  const { data: blacklist } = await db.from("blacklisted_buyers").select("*").order("created_at", { ascending: false });

  const totals = {
    count: chargebacks.length,
    openCount: chargebacks.filter((c: any) => OPEN_STATUSES.has(c.status)).length,
    wonCount: chargebacks.filter((c: any) => c.status === "won").length,
    lostCount: chargebacks.filter((c: any) => c.status === "lost").length,
    amountDisputed: chargebacks.reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
  };

  return NextResponse.json({ chargebacks, blacklist: blacklist || [], totals });
}
