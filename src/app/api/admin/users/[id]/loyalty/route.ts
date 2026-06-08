import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const [accountRes, txRes, referralCodeRes, redemptionRes] = await Promise.all([
    db.from("customer_accounts").select("id, first_name, last_name, email, loyalty_points").eq("id", id).single(),
    db.from("loyalty_transactions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    db.from("referral_codes").select("code, event_slug, created_at").eq("customer_id", id),
    db.from("redemptions").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);

  if (!accountRes.data) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get referrals made via this user's codes
  const codes = (referralCodeRes.data || []).map((c: any) => c.code);
  let referrals: any[] = [];
  if (codes.length > 0) {
    const { data } = await db.from("referrals").select("*").in("referral_code", codes).order("created_at", { ascending: false });
    referrals = data || [];
  }

  return NextResponse.json({
    account: accountRes.data,
    transactions: txRes.data || [],
    referralCodes: referralCodeRes.data || [],
    referrals,
    redemptions: redemptionRes.data || [],
  });
}
