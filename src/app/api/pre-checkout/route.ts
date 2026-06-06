import { NextRequest, NextResponse } from "next/server";
import { stripe, TICKET_PRICES, TICKET_LABELS, type TicketType } from "@/lib/stripe";
import { getEvent } from "@/lib/events";
import { verifyTurnstile } from "@/lib/turnstile";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, phone, eventSlug, ticketType, quantity, captchaToken } = await req.json();

  if (!firstName || !email || !eventSlug || !ticketType || !quantity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify CAPTCHA
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });

  const event = getEvent(eventSlug);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const unitAmount = TICKET_PRICES[ticketType as TicketType];
  if (!unitAmount) return NextResponse.json({ error: "Invalid ticket type" }, { status: 400 });

  // ── Save lead to Supabase immediately (even if they abandon checkout) ──
  const db = supabaseAdmin as any;
  const fullName = `${firstName} ${lastName}`.trim();

  await db.from("customer_accounts").upsert({
    email: email.toLowerCase(),
    first_name: firstName,
    last_name: lastName || null,
    phone: phone || null,
  }, { onConflict: "email", ignoreDuplicates: false });

  // ── Create Stripe checkout session with customer info pre-filled ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tequila-fest-usa.vercel.app";
  const orderNumber = `TF-${Date.now().toString(36).toUpperCase()}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: email,
    allow_promotion_codes: true,
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: unitAmount,
        product_data: {
          name: `${TICKET_LABELS[ticketType as TicketType]} — Tequila Fest ${event.city} 2026`,
          description: `${event.date} · ${event.venue}, ${event.venueDetail}`,
        },
      },
      quantity: Number(quantity),
    }],
    success_url: `${appUrl}/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}&event=${eventSlug}`,
    cancel_url: `${appUrl}/events/${eventSlug}`,
    metadata: {
      type: "ticket_purchase",
      eventSlug,
      ticketType,
      quantity: String(quantity),
      eventCity: event.city,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone || "",
      orderNumber,
    },
    payment_intent_data: {
      description: `Tequila Fest ${event.city} 2026 — ${TICKET_LABELS[ticketType as TicketType]} x${quantity}`,
      metadata: { eventSlug, ticketType, customerEmail: email },
    },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
