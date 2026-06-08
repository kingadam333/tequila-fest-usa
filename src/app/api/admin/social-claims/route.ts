import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

const SOCIAL_POINTS = 50;

// GET — list all pending social share claims
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("social_share_claims")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ claims: data || [] });
}

// POST — approve or reject a claim
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { claim_id, action } = await req.json(); // action: "approve" | "reject"
  if (!claim_id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "claim_id and action (approve|reject) required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: claim } = await db.from("social_share_claims").select("*").eq("id", claim_id).single();
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  if (action === "reject") {
    await db.from("social_share_claims").update({ status: "rejected" }).eq("id", claim_id);
    return NextResponse.json({ success: true, action: "rejected" });
  }

  // Approve: award points if customer is known
  await db.from("social_share_claims").update({ status: "approved", points_awarded: SOCIAL_POINTS }).eq("id", claim_id);

  if (claim.customer_id) {
    const { data: account } = await db.from("customer_accounts").select("loyalty_points").eq("id", claim.customer_id).single();
    if (account) {
      await db.from("customer_accounts")
        .update({ loyalty_points: (account.loyalty_points || 0) + SOCIAL_POINTS })
        .eq("id", claim.customer_id);

      await db.from("loyalty_transactions").insert({
        customer_id: claim.customer_id,
        action_code: "social_share",
        points: SOCIAL_POINTS,
        description: `Social share approved: ${claim.platform} — ${claim.post_url}`,
        source_id: claim_id,
        source_type: "social_claim",
      });
    }
  }

  return NextResponse.json({ success: true, action: "approved", pointsAwarded: SOCIAL_POINTS });
}
