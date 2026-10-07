import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { sessionUser } from "@/lib/sessionUser";

// "View Receipt" on /account. Redirects to Stripe's customer-facing receipt
// (charge.receipt_url). The old button linked to dashboard.stripe.com, which
// is the merchant dashboard and only ever showed customers a Stripe login.
// The order must belong to the logged-in customer (same email match as
// /api/account/orders).
export async function GET(req: NextRequest) {
  const user = await sessionUser(req);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  if (!user?.email) return NextResponse.redirect(`${appUrl}/login?redirect=/account`);

  const orderNumber = req.nextUrl.searchParams.get("order") || "";
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data: order } = await db
    .from("ticket_orders")
    .select("stripe_payment_intent_id, customer_email")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!order?.stripe_payment_intent_id || order.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, { expand: ["latest_charge"] });
    const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    if (charge?.receipt_url) return NextResponse.redirect(charge.receipt_url);
  } catch (err) {
    console.error("[receipt] Stripe lookup failed for", orderNumber, err);
  }
  return NextResponse.json({ error: "Receipt isn't available for this order. Email help@mail.tequilafestusa.com and we'll send one." }, { status: 404 });
}
