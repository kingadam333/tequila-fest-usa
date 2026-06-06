import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TICKET_PRICES, TICKET_LABELS, type TicketType } from "@/lib/ticket-config";
import { getEvent } from "@/lib/events";
import { verifyTurnstile } from "@/lib/turnstile";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateFeesForCart } from "@/lib/fees";

interface CartItem { ticketType: TicketType; quantity: number; price: number; platformFee?: number; }

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, phone, eventSlug, items, ticketType, quantity, captchaToken } = await req.json();

  if (!firstName || !email || !eventSlug) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });

  const event = getEvent(eventSlug);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Support both old single-item format and new multi-item cart format
  const cartItems: CartItem[] = items?.length > 0
    ? items
    : [{ ticketType: ticketType as TicketType, quantity: Number(quantity) || 1, price: TICKET_PRICES[ticketType as TicketType] / 100 }];

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "No tickets selected" }, { status: 400 });
  }

  // Save lead to Supabase immediately
  const db = supabaseAdmin as any;
  const fullName = `${firstName} ${lastName}`.trim();
  await db.from("customer_accounts").upsert({
    email: email.toLowerCase(),
    first_name: firstName,
    last_name: lastName || null,
    phone: phone || null,
  }, { onConflict: "email", ignoreDuplicates: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tequila-fest-usa.vercel.app";
  const orderNumber = `TF-${Date.now().toString(36).toUpperCase()}`;
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cartItems.reduce((s, i) => s + i.price * i.quantity, 0); // tickets only, fees added below

  // Calculate service fee using per-type platform fees
  const fees = calculateFeesForCart(
    cartItems.map(i => ({ price: i.price, quantity: i.quantity, platformFee: i.platformFee ?? 3.00 }))
  );
  const serviceFeeCents = Math.round(fees.serviceFee * 100);

  // Build Stripe line items from cart + service fee
  const stripeLineItems = [
    ...cartItems.map(item => ({
      price_data: {
        currency: "usd",
        unit_amount: TICKET_PRICES[item.ticketType],
        product_data: {
          name: `${TICKET_LABELS[item.ticketType]} — Tequila Fest ${event.city} 2026`,
          description: `${event.date} · ${event.venue}, ${event.venueDetail}`,
        },
      },
      quantity: item.quantity,
    })),
    {
      price_data: {
        currency: "usd",
        unit_amount: serviceFeeCents,
        product_data: {
          name: "Service Fee",
          description: `$3.00/ticket platform fee + 2.9% + $0.30 processing`,
        },
      },
      quantity: 1,
    },
  ];

  // Build ticket summary for metadata
  const ticketSummary = cartItems.map(i => `${i.quantity}x ${TICKET_LABELS[i.ticketType]}`).join(", ");
  const primaryType = cartItems.sort((a, b) => b.quantity - a.quantity)[0]?.ticketType || "earlyBird";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: email,
    allow_promotion_codes: true,
    line_items: stripeLineItems,
    success_url: `${appUrl}/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}&event=${eventSlug}`,
    cancel_url: `${appUrl}/events/${eventSlug}`,
    metadata: {
      type: "ticket_purchase",
      eventSlug,
      ticketType: primaryType,
      quantity: String(totalQty),
      ticketSummary,
      eventCity: event.city,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone || "",
      orderNumber,
      cartItems: JSON.stringify(cartItems.map(i => ({ type: i.ticketType, qty: i.quantity }))),
      serviceFee: fees.serviceFee.toFixed(2),
      platformFee: fees.platformFee.toFixed(2),
      ticketSubtotal: totalAmount.toFixed(2),
    },
    payment_intent_data: {
      description: `Tequila Fest ${event.city} 2026 — ${ticketSummary}`,
      metadata: { eventSlug, customerEmail: email },
    },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
