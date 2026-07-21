import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// One-time cleanup: existing paid vendor PaymentIntents were created before
// payment_intent_data.description was added to createVendorPaymentSession(),
// so they show up in the Stripe dashboard as bare IDs. This retroactively
// sets a readable description on each.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const db = supabaseAdmin as any;
  const { data: apps, error } = await db
    .from("vendor_applications")
    .select("id, business_name, cities, stripe_payment_intent_id")
    .eq("paid", true)
    .not("stripe_payment_intent_id", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const app of apps || []) {
    const cities: string[] = app.cities?.length ? app.cities : ["Festival"];
    const description = `Vendor - ${cities.join(", ")} (${app.business_name})`;
    try {
      await stripe.paymentIntents.update(app.stripe_payment_intent_id, { description });
      updated++;
    } catch (e: any) {
      if (e?.code === "resource_missing") {
        skipped++;
      } else {
        failed++;
        errors.push(`${app.stripe_payment_intent_id}: ${e?.message || "unknown error"}`);
      }
    }
  }

  return NextResponse.json({ total: apps?.length || 0, updated, skipped, failed, errors });
}
