import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Manual payout log — no Stripe Connect/automated money movement, this just
// records that the admin paid an affiliate outside the app (Venmo, check,
// etc.) so balanceOwed (commission earned minus payouts logged) stays accurate.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const { amount, note } = await req.json();

  const amt = Number(amount);
  if (!amt || amt <= 0) return NextResponse.json({ error: "A positive amount is required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("affiliate_payouts")
    .insert({ affiliate_id: id, amount: amt, note: note?.trim() || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payout: data });
}
