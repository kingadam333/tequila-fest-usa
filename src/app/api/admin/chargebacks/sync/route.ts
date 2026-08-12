import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { syncAllDisputesFromStripe } from "@/lib/chargebacks";

// One-off / on-demand backfill: pulls every dispute directly from Stripe
// (not just ones we've received a webhook for) — covers disputes that
// happened before this feature existed, or any missed webhook delivery.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  try {
    const synced = await syncAllDisputesFromStripe(db);
    return NextResponse.json({ ok: true, synced });
  } catch (err: any) {
    console.error("Chargeback sync error:", err);
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 });
  }
}
