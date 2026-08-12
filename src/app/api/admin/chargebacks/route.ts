import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  const { data: chargebacks, error } = await db
    .from("chargebacks")
    .select("*, ticket_orders(order_number, event_slug, event_city, ticket_type, quantity, created_at, billing_address, card_cvc_check, card_avs_check)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: blacklist } = await db.from("blacklisted_buyers").select("*").order("created_at", { ascending: false });

  const totals = {
    count: chargebacks?.length || 0,
    openCount: (chargebacks || []).filter((c: any) => ["warning_needs_response", "needs_response", "warning_under_review", "under_review"].includes(c.status)).length,
    wonCount: (chargebacks || []).filter((c: any) => c.status === "won").length,
    lostCount: (chargebacks || []).filter((c: any) => c.status === "lost").length,
    amountDisputed: (chargebacks || []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
  };

  return NextResponse.json({ chargebacks: chargebacks || [], blacklist: blacklist || [], totals });
}
