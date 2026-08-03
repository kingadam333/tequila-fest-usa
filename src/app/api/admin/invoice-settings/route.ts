import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Single-row settings table — the mailing address / Zelle info shown on
// every brand invoice (alongside the existing Stripe payment link), so
// checks and Zelle payments have somewhere to actually go. Editable here
// instead of hardcoded so it doesn't need a code change if it ever changes.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db.from("invoice_payment_settings").select("*").limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { check_payable_to, mailing_address, zelle_handle } = await req.json();

  const db = supabaseAdmin as any;
  const { data: existing } = await db.from("invoice_payment_settings").select("id").limit(1).maybeSingle();

  const updates = {
    check_payable_to: check_payable_to ?? undefined,
    mailing_address: mailing_address ?? undefined,
    zelle_handle: zelle_handle ?? undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = existing
    ? await db.from("invoice_payment_settings").update(updates).eq("id", existing.id).select().single()
    : await db.from("invoice_payment_settings").insert(updates).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
