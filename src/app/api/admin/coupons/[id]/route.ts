import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { parseCouponInput } from "@/lib/coupons";

// Admin: edit / pause / resume or delete one coupon. Deleting doesn't touch
// past orders, which keep the code they used in ticket_orders.coupon_code.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const parsed = parseCouponInput(await req.json().catch(() => null), { partial: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!Object.keys(parsed.values).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("coupons").update(parsed.values).eq("id", id).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A coupon with that code already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ coupon: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { error } = await db.from("coupons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
