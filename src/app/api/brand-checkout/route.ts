import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizeBrandName } from "@/lib/normalizeBrandName";

const TIER_PRICES: Record<string, number> = {
  Value: 250,
  Standard: 300,
  Premium: 350,
};

const CITY_LABELS: Record<string, string> = {
  cleveland: "Cleveland, OH",
  cincinnati: "Cincinnati, OH",
  columbus: "Columbus, OH",
  phoenix: "Phoenix, AZ",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brandName: rawBrandName, contactName, contactEmail, contactPhone, tier, cities, captchaToken } = body || {};

  // Turnstile
  const ok = await verifyTurnstile(captchaToken);
  if (!ok) return NextResponse.json({ error: "Captcha failed" }, { status: 400 });

  // Validate
  if (!rawBrandName?.trim() || !contactName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json({ error: "Brand, contact name, and email required" }, { status: 400 });
  }
  const brandName = normalizeBrandName(rawBrandName);
  if (!tier || !(tier in TIER_PRICES)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  const cityList: string[] = Array.isArray(cities) ? cities.filter((c) => typeof c === "string" && c in CITY_LABELS) : [];
  if (!cityList.length) {
    return NextResponse.json({ error: "At least one city required" }, { status: 400 });
  }

  const pricePerCity = TIER_PRICES[tier];
  const amount = pricePerCity * cityList.length;
  const orderNumber = `TFB-${Date.now().toString(36).toUpperCase()}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const cityLabels = cityList.map((c) => CITY_LABELS[c]).join(", ");

  // Persist pending order so the webhook can confirm by stripe_session_id later
  const db = supabaseAdmin as any;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: contactEmail,
    allow_promotion_codes: true,
    line_items: cityList.map((city) => ({
      price_data: {
        currency: "usd",
        unit_amount: pricePerCity * 100,
        product_data: {
          name: `${tier} Brand Package — ${CITY_LABELS[city]}`,
          description: `Tequila Fest USA 2026 · ${brandName}`,
        },
      },
      quantity: 1,
    })),
    success_url: `${appUrl}/brand-packages/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/brand-packages`,
    payment_intent_data: {
      description: `${brandName} — ${tier} Brand Package (${cityLabels})`,
    },
    metadata: {
      type: "brand_package",
      orderNumber,
      brandName,
      contactName,
      contactPhone: contactPhone || "",
      tier,
      cities: cityList.join(","),
      cityLabels,
      amount: String(amount),
    },
  });

  await db.from("brand_package_orders").insert({
    order_number: orderNumber,
    brand_name: brandName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone || null,
    tier,
    cities: cityList,
    amount,
    stripe_session_id: session.id,
    status: "pending",
  });

  return NextResponse.json({ url: session.url });
}
