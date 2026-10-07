import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { parseCouponInput } from "@/lib/coupons";

const duplicate = (code?: string) => code === "23505";

// Admin: list all coupons / create one.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data || [] });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const parsed = parseCouponInput(await req.json().catch(() => null), { partial: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("coupons").insert(parsed.values).select().single();
  if (error) {
    if (duplicate(error.code)) return NextResponse.json({ error: "A coupon with that code already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ coupon: data });
}
