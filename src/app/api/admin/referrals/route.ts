import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { REFERRAL_MILESTONE } from "@/lib/referralRewards";

// Global view of the refer-a-friend program — previously only visible one
// customer at a time (LoyaltyModal's Referrals sub-tab). Everything here is
// computed live from referral_codes/referrals, same as the customer-facing
// /api/referral route — no stored running counters to drift out of sync.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  const [{ data: codes }, { data: referrals }, { data: rewards }] = await Promise.all([
    db.from("referral_codes").select("customer_id, customer_email, event_slug, code, created_at"),
    db.from("referrals").select("referral_code, referrer_customer_id, referred_email, status, referred_order_id, points_awarded, created_at"),
    db.from("referral_rewards").select("*"),
  ]);

  const customerIds = Array.from(new Set((codes || []).map((c: any) => c.customer_id)));
  const { data: customers } = customerIds.length
    ? await db.from("customer_accounts").select("id, first_name, last_name, email").in("id", customerIds)
    : { data: [] };
  const customerById = new Map<string, { id: string; first_name: string; last_name: string; email: string }>(
    (customers || []).map((c: any) => [c.id, c])
  );

  const referralsByCode = new Map<string, any[]>();
  for (const r of referrals || []) {
    const list = referralsByCode.get(r.referral_code) || [];
    list.push(r);
    referralsByCode.set(r.referral_code, list);
  }

  const rewardByCustomerEvent = new Map<string, any>();
  for (const rw of rewards || []) rewardByCustomerEvent.set(`${rw.customer_id}|${rw.event_slug}`, rw);

  const rows = (codes || []).map((c: any) => {
    const customer = customerById.get(c.customer_id);
    const codeReferrals = referralsByCode.get(c.code) || [];
    const converted = codeReferrals.filter((r: any) => r.status === "converted").length;
    const pending = codeReferrals.filter((r: any) => r.status === "pending").length;
    const reward = rewardByCustomerEvent.get(`${c.customer_id}|${c.event_slug}`);
    return {
      customerId: c.customer_id,
      name: customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") : c.customer_email,
      email: customer?.email || c.customer_email,
      eventSlug: c.event_slug,
      code: c.code,
      sent: codeReferrals.length,
      converted,
      pending,
      progress: Math.min(converted, REFERRAL_MILESTONE),
      milestone: REFERRAL_MILESTONE,
      rewardStatus: reward?.status || null,
      rewardFulfilledAt: reward?.fulfilled_at || null,
      rewardId: reward?.id || null,
    };
  });

  const totals = {
    referrers: rows.length,
    sent: rows.reduce((s: number, r: typeof rows[number]) => s + r.sent, 0),
    converted: rows.reduce((s: number, r: typeof rows[number]) => s + r.converted, 0),
    rewardsFulfilled: (rewards || []).filter((r: any) => r.status === "fulfilled").length,
    rewardsNeedingAttention: (rewards || []).filter((r: any) => r.status === "capacity_blocked" || r.status === "no_ticket").length,
  };

  return NextResponse.json({ rows: rows.sort((a: typeof rows[number], b: typeof rows[number]) => b.converted - a.converted), totals });
}
